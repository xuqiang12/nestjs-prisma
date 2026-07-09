import { Injectable } from '@nestjs/common'
import { AiOrchestratorService } from '../../../ai-engine/orchestrator/ai-orchestrator.service'
import { ConversationService } from '../conversation/conversation.service'
import { ChatMode, ChatRequestDto } from './dto/chat.dto'

export type ChatStreamEvent =
  | { type: 'content'; content: string }
  | { type: 'sources'; sources: any[] }

@Injectable()
export class ChatService {
  constructor(
    private readonly aiOrchestratorService: AiOrchestratorService,
    private readonly conversationService: ConversationService,
  ) {}

  async chat(body: ChatRequestDto, userId: number) {
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: body.message,
      mode: body.mode,
    })
    const history = await this.conversationService.getHistoryMessages(conversation.id)
    await this.conversationService.addMessage(conversation.id, 'user', body.message)

    const plan = await this.aiOrchestratorService.buildCompletion(
      body.message,
      this.normalizeMode(conversation.mode),
      history,
    )
    const answer = await this.aiOrchestratorService.complete(plan.messages)
    await this.conversationService.addMessage(conversation.id, 'assistant', answer, plan.sources)
    await this.conversationService.touchConversation(conversation.id)

    return {
      conversationId: conversation.id,
      mode: conversation.mode,
      answer,
      route: plan.route,
      sources: plan.sources,
    }
  }

  async *stream(body: ChatRequestDto, userId: number): AsyncIterable<ChatStreamEvent> {
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: body.message,
      mode: body.mode,
    })
    const history = await this.conversationService.getHistoryMessages(conversation.id)
    await this.conversationService.addMessage(conversation.id, 'user', body.message)

    const plan = await this.aiOrchestratorService.buildCompletion(
      body.message,
      this.normalizeMode(conversation.mode),
      history,
    )
    let answer = ''

    for await (const content of this.aiOrchestratorService.streamCompletion(plan.messages)) {
      answer += content
      yield { type: 'content', content }
    }

    await this.conversationService.addMessage(conversation.id, 'assistant', answer, plan.sources)
    await this.conversationService.touchConversation(conversation.id)
    yield { type: 'sources', sources: plan.sources }
  }

  private normalizeMode(mode: string): ChatMode {
    return mode === 'knowledge' ? 'knowledge' : 'chat'
  }
}
