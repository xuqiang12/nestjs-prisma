// 将运行时内部事件汇总成前端可展示的执行轨迹。
import { Injectable } from '@nestjs/common'
import { AgentEvent, AgentTraceUpdateEvent } from '../events/agent-event.types'
import { ExecutionTrace } from './execution-trace.types'
import { ExecutionTraceBuilderService } from './execution-trace-builder.service'

@Injectable()
export class ExecutionTracePresenterService {
  private readonly traces = new Map<string, ExecutionTrace>()

  // 注入 Trace Builder，保证实时事件和历史持久化使用同一套汇总规则。
  constructor(private readonly executionTraceBuilder: ExecutionTraceBuilderService) {}

  // 消费一个运行时事件，并返回需要发给前端的 trace 更新事件。
  consume(event: AgentEvent): AgentTraceUpdateEvent[] {
    const requestId = event.metadata.requestId || 'default'
    const trace = this.getTrace(requestId)
    const updatedTrace = this.executionTraceBuilder.applyEvent(trace, event)
    if (!updatedTrace) {
      return []
    }

    const traceEvent = this.toTraceEvent(updatedTrace, event)
    if (event.type === 'error' || event.type === 'done') {
      this.traces.delete(requestId)
    }
    return [traceEvent]
  }

  // 生成前端可消费的 trace_update 事件。
  private toTraceEvent(trace: ExecutionTrace, event: AgentEvent): AgentTraceUpdateEvent {
    return {
      type: 'trace_update',
      payload: {
        executionTrace: this.executionTraceBuilder.cloneTrace(trace),
      },
      metadata: event.metadata,
    }
  }

  // 取当前请求的 trace，没有则创建空轨迹。
  private getTrace(requestId: string): ExecutionTrace {
    if (!this.traces.has(requestId)) {
      this.traces.set(requestId, this.executionTraceBuilder.createEmptyTrace())
    }
    return this.traces.get(requestId)!
  }
}
