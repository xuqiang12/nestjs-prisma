// 组合底层 LLM 与知识库问答能力生成对话完成计划。
import { Injectable } from '@nestjs/common'
import { KnowledgeAnswerGuardService } from '../knowledge-qa/knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from '../knowledge-qa/knowledge-evidence.service'
import { KnowledgeQAService } from '../knowledge-qa/knowledge-qa.service'
import {
  BuildCompletionOptions,
  ChatMode,
  CompletionPlan,
  KnowledgeFact,
} from '../knowledge-qa/knowledge.types'
import { ChatMessage, LlmOptions, LlmService } from '../llm/llm.service'
import { VectorStoreService } from '../vector/vector-store.service'

export {
  BuildCompletionOptions,
  ChatMode,
  CompletionPlan,
  KnowledgeFact,
} from '../knowledge-qa/knowledge.types'

type OrchestratorCompletionOptions = BuildCompletionOptions & {
  knowledgeTags?: string[]
  knowledgeBaseIds?: string[]
}

@Injectable()
export class AiOrchestratorService {
  private readonly knowledgeQAService: KnowledgeQAService

  constructor(
    private readonly llmService: LlmService,
    private readonly vectorStoreService: VectorStoreService,
    knowledgeQAService?: KnowledgeQAService,
  ) {
    this.knowledgeQAService = knowledgeQAService || new KnowledgeQAService(
      llmService,
      vectorStoreService,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )
  }

  // 执行普通聊天：构建普通对话消息后调用大模型，并返回本次路由类型。
  async chat(message: string) {
    const plan = await this.buildCompletion(message, 'chat')
    const answer = await this.complete(plan.messages)
    return { answer, route: plan.route }
  }

  // 执行普通聊天的流式输出：复用普通对话消息，只把模型返回的文本片段逐段交给上层。
  async *stream(message: string): AsyncIterable<string> {
    const plan = await this.buildCompletion(message, 'chat')
    for await (const content of this.streamCompletion(plan.messages)) {
      yield content
    }
  }

  // 执行知识库问答：knowledge 路径已收口到 KnowledgeQAService。
  async rag(message: string) {
    return this.knowledgeQAService.answer({
      question: message,
      history: [],
    })
  }

  // 构建模型调用计划，普通聊天保留本地构建，知识库问答委托给 KnowledgeQAService。
  async buildCompletion(
    message: string,
    mode: ChatMode = 'chat',
    history: ChatMessage[] = [],
    options: OrchestratorCompletionOptions = {},
  ): Promise<CompletionPlan> {
    if (mode === 'knowledge') {
      return this.knowledgeQAService.buildCompletion({
        question: message,
        history,
        ...options,
      })
    }

    // 普通 chat 不自动检索知识库或执行工具，只拼接系统提示词、干净历史和当前用户消息。
    return {
      route: 'chat',
      messages: [
        ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
        ...this.normalizeHistory(history),
        { role: 'user', content: message },
      ],
      sources: [],
      knowledgeFacts: [],
      evidence: { sources: [], items: [], facts: [] },
    }
  }

  // 根据已构建好的消息数组发起一次非流式模型调用。
  async complete(messages: ChatMessage[], options?: LlmOptions) {
    return this.llmService.invokeWithMessages(messages, this.withFinalAnswerOptions(options))
  }

  // 根据已构建好的消息数组发起一次流式模型调用。
  streamCompletion(messages: ChatMessage[], options?: LlmOptions) {
    return this.llmService.streamWithMessages(messages, this.withFinalAnswerOptions(options))
  }

  // 清洗知识库回答中不应暴露给用户的角色模板痕迹。
  sanitizeKnowledgeAnswer(content: string) {
    return this.knowledgeQAService.sanitizeAnswer(content)
  }

  // 根据事实依据约束知识库回答，避免输出不受支持的数字和结论。
  ensureKnowledgeAnswer(content: string, facts: KnowledgeFact[], question = '') {
    return this.knowledgeQAService.ensureAnswer(content, facts, question)
  }

  // 为最终回答补充输出守卫选项。
  private withFinalAnswerOptions(options: LlmOptions = {}): LlmOptions {
    return {
      ...options,
      finalAnswerGuard: true,
      roleTemplateStops: true,
    }
  }

  // 过滤历史消息，只保留模型支持的用户消息和助手消息。
  private normalizeHistory(history: ChatMessage[]) {
    return history.filter((item) => item.role === 'user' || item.role === 'assistant')
  }
}
