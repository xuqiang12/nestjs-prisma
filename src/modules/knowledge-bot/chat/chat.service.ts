import { Injectable } from '@nestjs/common'
import { AgentRuntimeService } from '../../../ai-engine/agent/agent-runtime.service'
import { AiOrchestratorService } from '../../../ai-engine/orchestrator/ai-orchestrator.service'
import { SensitiveWordCheckerService } from '../../../ai-engine/safety/sensitive-word-checker.service'
import { WorkflowStreamEvent } from '../../../ai-engine/workflow/workflow.types'
import { WorkflowRuntimeService } from '../../../ai-engine/workflow/workflow-runtime.service'
import { ConversationService } from '../conversation/conversation.service'
import { ChatMode, ChatRequestDto } from './dto/chat.dto'

export type ChatStreamEvent =
  | { type: 'content'; content: string }
  | { type: 'sources'; sources: any[] }
  | { type: 'error'; code: string; message: string }
  | WorkflowStreamEvent

@Injectable()
export class ChatService {
  constructor(
    private readonly aiOrchestratorService: AiOrchestratorService,
    private readonly conversationService: ConversationService,
    private readonly agentRuntimeService: AgentRuntimeService,
    private readonly sensitiveWordCheckerService: SensitiveWordCheckerService,
    private readonly workflowRuntimeService: WorkflowRuntimeService,
  ) {}

  // 处理非流式聊天：维护会话、读取历史、调用 AI，并保存完整问答记录。
  async chat(body: ChatRequestDto, userId: string) {
    const checkedInput = await this.sensitiveWordCheckerService.checkAndApply(body.message, 'input')
    const agent = await this.agentRuntimeService.resolve(body.agentCode)
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: checkedInput.content,
      mode: agent?.mode || body.mode,
      agentCode: agent?.agentCode,
    })
    // 历史消息在写入当前用户问题前读取，避免当前问题在 prompt 中重复出现。
    const history = await this.conversationService.getHistoryMessages(conversation.id)
    await this.conversationService.addMessage(
      conversation.id,
      'user',
      checkedInput.content,
      undefined,
      {
        agentCode: agent?.agentCode,
        promptId: agent?.promptId,
        workflowCode: agent?.workflowCode,
      },
    )

    // Agent 绑定了工作流时，聊天执行权交给工作流节点；普通问答/RAG 编排不再参与。
    if (agent?.workflowCode) {
      const workflowResult = await this.workflowRuntimeService.execute(agent.workflowCode, {
        message: checkedInput.content,
        userId,
        history,
        agentCode: agent.agentCode,
        workflowCode: agent.workflowCode,
        conversationId: conversation.id,
        allowedToolCodes: agent.toolCodes,
        knowledgeStrict: agent.knowledgeStrict,
        knowledgeTags: agent.knowledgeTags,
        knowledgeBaseIds: agent.knowledgeBaseIds,
        llmOptions: agent.llmOptions,
      })
      const checkedOutput = await this.sensitiveWordCheckerService.checkAndApply(
        workflowResult.answer,
        'output',
      )
      await this.conversationService.addMessage(
        conversation.id,
        'assistant',
        checkedOutput.content,
        workflowResult.sources,
        {
          agentCode: agent.agentCode,
          promptId: agent.promptId,
          workflowCode: agent.workflowCode,
        },
      )
      await this.conversationService.touchConversation(conversation.id)

      return {
        conversationId: conversation.id,
        mode: conversation.mode,
        agentCode: agent.agentCode,
        promptId: agent.promptId,
        workflowCode: agent.workflowCode,
        answer: checkedOutput.content,
        route: 'workflow',
        sources: workflowResult.sources,
      }
    }

    const plan = await this.aiOrchestratorService.buildCompletion(
      checkedInput.content,
      agent?.mode || this.normalizeMode(conversation.mode),
      history,
      {
        systemPrompt: agent?.systemPrompt,
        allowedToolCodes: agent?.toolCodes,
        knowledgeStrict: agent?.knowledgeStrict,
        knowledgeTags: agent?.knowledgeTags,
        knowledgeBaseIds: agent?.knowledgeBaseIds,
      },
    )
    // 编排阶段可能已经给出直答；没有直答时才调用模型补全。
    const rawAnswer = plan.directAnswer || await this.aiOrchestratorService.complete(plan.messages, agent?.llmOptions)
    const answer = plan.route === 'knowledge' ? this.aiOrchestratorService.ensureKnowledgeAnswer(rawAnswer, plan.knowledgeFacts, checkedInput.content) : rawAnswer
    const checkedOutput = await this.sensitiveWordCheckerService.checkAndApply(answer, 'output')
    await this.conversationService.addMessage(
      conversation.id,
      'assistant',
      checkedOutput.content,
      plan.sources,
      {
        agentCode: agent?.agentCode,
        promptId: agent?.promptId,
        workflowCode: agent?.workflowCode,
      },
    )
    await this.conversationService.touchConversation(conversation.id)

    return {
      conversationId: conversation.id,
      mode: conversation.mode,
      agentCode: agent?.agentCode,
      promptId: agent?.promptId,
      answer: checkedOutput.content,
      route: plan.route,
      sources: plan.sources,
    }
  }

  // 处理流式聊天：边返回模型片段边累计完整答案，结束后再落库 assistant 消息。
  async *stream(body: ChatRequestDto, userId: string): AsyncIterable<ChatStreamEvent> {
    // 敏感词检查与处理
    const checkedInput = await this.sensitiveWordCheckerService.checkAndApply(body.message, 'input')
    // Agent 配置解析  包含提示词、模型、工具、工作流等配置
    const agent = await this.agentRuntimeService.resolve(body.agentCode)
    // 会话创建
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: checkedInput.content,
      mode: agent?.mode || body.mode,
      agentCode: agent?.agentCode,
    })
    // 流式链路同样先取历史再保存当前问题，保证上下文和非流式接口一致。
    const history = await this.conversationService.getHistoryMessages(conversation.id)
    await this.conversationService.addMessage(
      conversation.id,
      'user',
      checkedInput.content,
      undefined,
      {
        agentCode: agent?.agentCode,
        promptId: agent?.promptId,
        workflowCode: agent?.workflowCode,
      },
    )

    // Agent 绑定了工作流时，流式输出直接透传工作流事件，结束后再统一保存助手消息。
    if (agent?.workflowCode) {
      // 保存完整 AI 回复
      let answer = ''
      // 知识库来源
      let sources: any[] = []
      let hasSourcesEvent = false
      for await (const event of await this.workflowRuntimeService.stream(agent.workflowCode, {
        message: checkedInput.content,
        userId,
        history,
        agentCode: agent.agentCode,
        workflowCode: agent.workflowCode,
        conversationId: conversation.id,
        allowedToolCodes: agent.toolCodes,
        knowledgeStrict: agent.knowledgeStrict,
        knowledgeTags: agent.knowledgeTags,
        knowledgeBaseIds: agent.knowledgeBaseIds,
        llmOptions: agent.llmOptions,
      })) {
        if (event.type === 'content') {
          answer += event.content
        }
        if (event.type === 'sources') {
          sources = event.sources || []
          hasSourcesEvent = true
        }
        yield event
      }
      const checkedOutput = await this.sensitiveWordCheckerService.checkAndApply(answer, 'output')
      await this.conversationService.addMessage(
        conversation.id,
        'assistant',
        checkedOutput.content,
        sources,
        {
          agentCode: agent.agentCode,
          promptId: agent.promptId,
          workflowCode: agent.workflowCode,
        },
      )
      await this.conversationService.touchConversation(conversation.id)
      if (!hasSourcesEvent) {
        yield { type: 'sources', sources }
      }
      return
    }

    const plan = await this.aiOrchestratorService.buildCompletion(
      checkedInput.content,
      agent?.mode || this.normalizeMode(conversation.mode),
      history,
      {
        systemPrompt: agent?.systemPrompt,
        allowedToolCodes: agent?.toolCodes,
        knowledgeStrict: agent?.knowledgeStrict,
        knowledgeTags: agent?.knowledgeTags,
        knowledgeBaseIds: agent?.knowledgeBaseIds,
      },
    )
    let answer = ''

    // 命中直答时无需再开启模型流，直接把完整答案作为一次 content 事件返回。
    if (plan.directAnswer) {
      answer = plan.route === 'knowledge' ? this.aiOrchestratorService.ensureKnowledgeAnswer(plan.directAnswer, plan.knowledgeFacts, checkedInput.content) : plan.directAnswer
      yield { type: 'content', content: answer }
      const checkedOutput = await this.sensitiveWordCheckerService.checkAndApply(answer, 'output')
      await this.conversationService.addMessage(
        conversation.id,
        'assistant',
        checkedOutput.content,
        plan.sources,
        {
          agentCode: agent?.agentCode,
          promptId: agent?.promptId,
          workflowCode: agent?.workflowCode,
        },
      )
      await this.conversationService.touchConversation(conversation.id)
      yield { type: 'sources', sources: plan.sources }
      return
    }

    for await (const content of this.aiOrchestratorService.streamCompletion(
      plan.messages,
      agent?.llmOptions,
    )) {
      answer += content
      if (plan.route !== 'knowledge') {
        yield { type: 'content', content }
      }
    }

    if (plan.route === 'knowledge') {
      answer = this.aiOrchestratorService.ensureKnowledgeAnswer(answer, plan.knowledgeFacts, checkedInput.content)
      yield { type: 'content', content: answer }
    }

    // 模型流结束后保存完整答案，前端仍通过最后的 sources 事件拿到知识来源。
    const checkedOutput = await this.sensitiveWordCheckerService.checkAndApply(answer, 'output')
    await this.conversationService.addMessage(
      conversation.id,
      'assistant',
      checkedOutput.content,
      plan.sources,
      {
        agentCode: agent?.agentCode,
        promptId: agent?.promptId,
        workflowCode: agent?.workflowCode,
      },
    )
    await this.conversationService.touchConversation(conversation.id)
    yield { type: 'sources', sources: plan.sources }
  }

  // 兜底规范化会话模式，避免未知模式直接传入 AI 编排层。
  private normalizeMode(mode: string): ChatMode {
    return mode === 'knowledge' ? 'knowledge' : 'chat'
  }
}
