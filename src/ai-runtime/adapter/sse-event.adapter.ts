// 把内部事件转换成 SSE 协议格式。
import { Injectable } from '@nestjs/common'
import { AgentEvent } from '../events/agent-event.types'

@Injectable()
export class SseEventAdapter {
  // 将协议无关的 AgentEvent 转换为前端可消费的 SSE data 文本。
  toSseData(event: AgentEvent) {
    if (event.type === 'done') {
      return 'data: [DONE]\n\n'
    }

    return `data: ${JSON.stringify(event)}\n\n`
  }
}
