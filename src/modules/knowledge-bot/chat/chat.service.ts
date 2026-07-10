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

  // 处理非流式聊天：维护会话、读取历史、调用 AI，并保存完整问答记录。
  async chat(body: ChatRequestDto, userId: number) {
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: body.message,
      mode: body.mode,
    })
    // 历史消息在写入当前用户问题前读取，避免当前问题在 prompt 中重复出现。
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

  // 处理流式聊天：边返回模型片段边累计完整答案，结束后再落库 assistant 消息。
  async *stream(body: ChatRequestDto, userId: number): AsyncIterable<ChatStreamEvent> {
    const conversation = await this.conversationService.getOrCreateForMessage(userId, {
      conversationId: body.conversationId,
      message: body.message,
      mode: body.mode,
    })
    // 流式链路同样先取历史再保存当前问题，保证上下文和非流式接口一致。
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

    // 模型流结束后保存完整答案，前端仍通过最后的 sources 事件拿到知识来源。
    await this.conversationService.addMessage(conversation.id, 'assistant', answer, plan.sources)
    await this.conversationService.touchConversation(conversation.id)
    yield { type: 'sources', sources: plan.sources }
  }

  // 兜底规范化会话模式，避免未知模式直接传入 AI 编排层。
  private normalizeMode(mode: string): ChatMode {
    return mode === 'knowledge' ? 'knowledge' : 'chat'
  }
}
