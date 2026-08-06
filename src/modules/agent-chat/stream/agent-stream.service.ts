// 生成新版智能体流式入口的协议事件。
import { Injectable } from '@nestjs/common'
import { AgentEvent, AgentEventMetadata } from '../../../ai-runtime/events/agent-event.types'
import { AgentChatService } from '../chat/agent-chat.service'
import { AgentStreamRequestDto } from './dto/agent-stream.dto'

@Injectable()
export class AgentStreamService {
  // 注入新版智能体对话服务，保持流式服务只维护入口事件生命周期。
  constructor(private readonly agentChatService: AgentChatService) {}

  // 从 v2 流式入口请求开始产出内部事件并追加结束事件。
  async *stream(body: Partial<AgentStreamRequestDto>, userId?: string): AsyncIterable<AgentEvent> {
    const metadata: AgentEventMetadata = {
      requestId: `agent-chat-v2-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    if (!body.agentCode || !body.agentCode.trim()) {
      yield {
        type: 'error',
        payload: {
          code: 'AGENT_CODE_REQUIRED',
          message: 'agent聊天流式接口必须提供agentCode',
        },
        metadata,
      }
      yield { type: 'done', payload: {}, metadata }
      return
    }

    if (!userId) {
      yield {
        type: 'error',
        payload: {
          code: 'AGENT_CHAT_V2_USER_REQUIRED',
          message: '用户未登录或登录状态已失效，请重新登录',
        },
        metadata,
      }
      yield { type: 'done', payload: {}, metadata }
      return
    }

    try {
      for await (const event of this.agentChatService.stream(
        body as AgentStreamRequestDto,
        userId,
        metadata,
      )) {
        yield event
      }
    } catch (error) {
      yield {
        type: 'error',
        payload: {
          code: 'AGENT_CHAT_V2_ERROR',
          message: error instanceof Error ? error.message : 'agent chat v2 runtime error',
        },
        metadata,
      }
    }
    yield { type: 'done', payload: {}, metadata }
  }
}
