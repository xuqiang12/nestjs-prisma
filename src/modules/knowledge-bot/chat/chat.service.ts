import { Injectable } from '@nestjs/common'
import { AgentRuntimeService } from '../../../ai-engine/agent/agent-runtime.service'
import { AgentRuntimeStreamResult } from '../../../ai-engine/agent/agent-runtime.types'
import { SensitiveWordCheckerService } from '../../../ai-engine/safety/sensitive-word-checker.service'
import { WorkflowStreamEvent } from '../../../ai-engine/workflow/workflow.types'
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
    private readonly conversationService: ConversationService,
    private readonly agentRuntimeService: AgentRuntimeService,
    private readonly sensitiveWordCheckerService: SensitiveWordCheckerService,
  ) {}

  async chat(body: ChatRequestDto, userId: string) {
    const checkedInput = await this.sensitiveWordCheckerService.checkAndApply(body.message, 'input')
    const agent = await this.agentRuntimeService.resolve(body.agentCode)
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: checkedInput.content,
      mode: agent?.mode || body.mode,
      agentCode: agent?.agentCode,
    })
    // History is read before storing this turn so the prompt does not duplicate the current question.
    const history = await this.conversationService.getHistoryMessages(conversation.id)
    const userMessage = await this.conversationService.addMessage(
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
    const result = await this.agentRuntimeService.execute({
      message: checkedInput.content,
      userId,
      history,
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      mode: agent?.mode || this.normalizeMode(conversation.mode),
      agent,
    })
    const checkedOutput = await this.sensitiveWordCheckerService.checkAndApply(result.answer, 'output')
    await this.conversationService.addMessage(
      conversation.id,
      'assistant',
      checkedOutput.content,
      result.sources,
      {
        agentCode: agent?.agentCode,
        promptId: agent?.promptId,
        workflowCode: result.workflowCode,
      },
    )
    await this.conversationService.touchConversation(conversation.id)

    return {
      conversationId: conversation.id,
      mode: conversation.mode,
      agentCode: agent?.agentCode,
      promptId: agent?.promptId,
      workflowCode: result.workflowCode,
      answer: checkedOutput.content,
      route: result.route,
      sources: result.sources,
      executionLogId: result.executionLogId,
    }
  }

  async *stream(body: ChatRequestDto, userId: string): AsyncIterable<ChatStreamEvent> {
    const checkedInput = await this.sensitiveWordCheckerService.checkAndApply(body.message, 'input')
    const agent = await this.agentRuntimeService.resolve(body.agentCode)
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: checkedInput.content,
      mode: agent?.mode || body.mode,
      agentCode: agent?.agentCode,
    })
    // Keep streaming and non-streaming prompt history rules aligned.
    const history = await this.conversationService.getHistoryMessages(conversation.id)
    const userMessage = await this.conversationService.addMessage(
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
    let answer = ''
    let sources: any[] = []
    let state: AgentRuntimeStreamResult | undefined
    for await (const chunk of this.agentRuntimeService.stream({
      message: checkedInput.content,
      userId,
      history,
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      mode: agent?.mode || this.normalizeMode(conversation.mode),
      agent,
    })) {
      const event = chunk.event
      if (event.type === 'content') {
        answer += event.content
      }
      if (event.type === 'sources') {
        sources = event.sources || []
      }
      if (chunk.state) {
        state = chunk.state
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
        agentCode: agent?.agentCode,
        promptId: agent?.promptId,
        workflowCode: state?.workflowCode,
      },
    )
    await this.conversationService.touchConversation(conversation.id)
  }

  private normalizeMode(mode: string): ChatMode {
    return mode === 'knowledge' ? 'knowledge' : 'chat'
  }
}
