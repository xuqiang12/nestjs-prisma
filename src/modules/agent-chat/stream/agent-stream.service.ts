// 生成新版智能体流式入口的协议事件。
import { Injectable } from '@nestjs/common'
import { AgentEvent, AgentEventMetadata } from '../../../ai-runtime/events/agent-event.types'
import { ExecutionTracePresenterService } from '../../../ai-runtime/trace/execution-trace-presenter.service'
import { AgentChatService } from '../chat/agent-chat.service'
import { AgentStreamRequestDto } from './dto/agent-stream.dto'

@Injectable()
export class AgentStreamService {
  // 注入新版智能体对话服务和执行轨迹转换器，保持入口只输出前端协议事件。
  constructor(
    private readonly agentChatService: AgentChatService,
    private readonly executionTracePresenter: ExecutionTracePresenterService,
  ) {}

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

    let hasRuntimeError = false
    try {
      for await (const event of this.agentChatService.stream(
        body as AgentStreamRequestDto,
        userId,
        metadata,
      )) {
        for (const traceEvent of this.executionTracePresenter.consume(event)) {
          yield traceEvent
        }
        if (event.type === 'content' || event.type === 'error') {
          yield event
        }
      }
    } catch (error) {
      hasRuntimeError = true
      const errorEvent: AgentEvent = {
        type: 'error',
        payload: {
          code: 'AGENT_CHAT_V2_ERROR',
          message: error instanceof Error ? error.message : '智能体对话运行异常',
        },
        metadata,
      }
      for (const traceEvent of this.executionTracePresenter.consume(errorEvent)) {
        yield traceEvent
      }
      yield errorEvent
    }
    const doneEvent: AgentEvent = { type: 'done', payload: {}, metadata }
    if (!hasRuntimeError) {
      for (const traceEvent of this.executionTracePresenter.consume(doneEvent)) {
        yield traceEvent
      }
    }
    yield doneEvent
  }
}
