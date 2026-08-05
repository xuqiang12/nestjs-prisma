// 生成新版智能体流式入口的协议事件。
import { Injectable } from '@nestjs/common'
import { AgentEvent, AgentEventMetadata } from '../../../ai-engine/agent-v2/composer/agent-event.types'
import { AgentStreamRequestDto } from './dto/agent-stream.dto'

@Injectable()
export class AgentStreamService {
  // 生成 v2 流式入口的占位事件，先校验 agentCode 合同再等待后续运行时接入。
  async *stream(body: Partial<AgentStreamRequestDto>): AsyncIterable<AgentEvent> {
    const metadata: AgentEventMetadata = {
      requestId: `agent-chat-v2-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    if (!body.agentCode || !body.agentCode.trim()) {
      yield {
        type: 'error',
        payload: {
          code: 'AGENT_CODE_REQUIRED',
          message: 'agentCode is required for agent chat v2 stream',
        },
        metadata,
      }
      yield { type: 'done', payload: {}, metadata }
      return
    }

    yield {
      type: 'error',
      payload: {
        code: 'AGENT_CHAT_V2_NOT_IMPLEMENTED',
        message: 'agent chat v2 runtime is not implemented yet',
      },
      metadata,
    }
    yield { type: 'done', payload: {}, metadata }
  }
}
