// 处理新版智能体对话的安全检查、会话消息和运行时调用闭环。
import { Injectable } from '@nestjs/common'
import { SensitiveWordCheckerService } from '../../../ai-runtime/safety/sensitive-word-checker.service'
import { AgentRuntimeService } from '../../../ai-runtime/agent-runtime.service'
import { AgentRuntimeRequest } from '../../../ai-runtime/agent-runtime.types'
import { AgentComposer } from '../../../ai-runtime/composer/agent-composer.service'
import { AgentEvent, AgentEventMetadata } from '../../../ai-runtime/events/agent-event.types'
import { ConversationRepository } from '../persistence/conversation.repository'
import { AgentStreamRequestDto } from '../stream/dto/agent-stream.dto'

@Injectable()
export class AgentChatService {
  // 注入安全、会话、运行时和事件汇总依赖。
  constructor(
    private readonly sensitiveWordChecker: SensitiveWordCheckerService,
    private readonly conversationRepository: ConversationRepository,
    private readonly runtime: AgentRuntimeService,
    private readonly composer: AgentComposer,
  ) {}

  // 从用户消息开始完成 v2 对话安全检查、运行时调用和消息保存。
  async *stream(body: AgentStreamRequestDto, userId: string, metadata?: AgentEventMetadata): AsyncIterable<AgentEvent> {
    const input = await this.sensitiveWordChecker.checkAndApply(body.message, 'input')
    const conversation = await this.conversationRepository.getOrCreateConversation(
      userId,
      body.agentCode,
      input.content,
      body.conversationId,
    )
    await this.conversationRepository.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content: input.content,
      agentCode: body.agentCode,
    })

    const events: AgentEvent[] = []
    const request = this.createRuntimeRequest(body, userId, input.content, conversation.id, metadata)
    for await (const event of this.runtime.stream(request)) {
      events.push(event)
      yield event
    }

    const result = this.composer.collectAssistantResult(events)
    if (result.answer) {
      const output = await this.sensitiveWordChecker.checkAndApply(result.answer, 'output')
      await this.conversationRepository.saveMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: output.content,
        sources: result.sources,
        agentCode: body.agentCode,
        promptId: result.promptId,
        workflowCode: result.workflowCode,
      })
    }
    await this.conversationRepository.touchConversation(conversation.id)
  }

  // 把流式入口 DTO 转成运行时统一请求。
  private createRuntimeRequest(
    body: AgentStreamRequestDto,
    userId: string,
    message: string,
    conversationId: string,
    metadata?: AgentEventMetadata,
  ): AgentRuntimeRequest {
    return {
      message: { content: message },
      agent: { code: body.agentCode },
      user: { id: userId, roles: [], permissions: [] },
      conversation: { id: conversationId },
      stream: { enabled: true },
      metadata: {
        requestId: metadata?.requestId || `agent-chat-v2-${Date.now()}`,
        channel: 'agent-chat-v2',
        source: 'stream',
        createdAt: new Date(),
      },
    }
  }
}
