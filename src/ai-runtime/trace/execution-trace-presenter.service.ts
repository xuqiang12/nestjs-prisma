// 将运行时内部事件汇总成前端可展示的执行轨迹。
import { Injectable } from '@nestjs/common'
import { AgentEvent, AgentTraceUpdateEvent } from '../events/agent-event.types'
import type { AgentWorkflowEvent } from '../events/agent-event.types'
import { ExecutionTrace, ExecutionTraceStep } from './execution-trace.types'

@Injectable()
export class ExecutionTracePresenterService {
  private readonly traces = new Map<string, ExecutionTrace>()

  // 消费一个运行时事件，并返回需要发给前端的 trace 更新事件。
  consume(event: AgentEvent): AgentTraceUpdateEvent[] {
    const requestId = event.metadata.requestId || 'default'
    const trace = this.getTrace(requestId)

    if (event.type === 'plan') {
      const step = event.payload.plan?.steps?.[0]
      trace.capability = this.normalizeCapability(step?.capability)
      trace.summary = this.getCapabilityLabel(trace.capability)
      trace.status = 'running'
      this.upsertStep(trace, {
        id: 'plan',
        type: 'plan',
        title: '意图识别',
        status: 'done',
        summary: step?.reason || trace.summary,
        detail: {
          capability: step?.capability,
          plannerView: event.payload.plannerView,
          input: step?.input,
        },
      })
      return [this.toTraceEvent(trace, event)]
    }

    if (event.type === 'sources') {
      const sources = event.payload.sources || []
      this.upsertStep(trace, {
        id: 'rag',
        type: 'rag',
        title: '知识库检索',
        status: 'done',
        summary: `命中 ${sources.length} 个来源`,
        detail: { count: sources.length, sources },
      })
      return [this.toTraceEvent(trace, event)]
    }

    if (event.type === 'tool_start' || event.type === 'tool_done') {
      const tool = event.payload.tool
      const previous = this.findStep(trace, `tool-${tool.code}`)
      this.upsertStep(trace, {
        id: `tool-${tool.code}`,
        type: 'tool',
        title: '工具调用',
        status: event.type === 'tool_done' ? 'done' : 'running',
        summary: tool.code,
        detail: {
          ...previous?.detail,
          ...tool,
        },
      })
      return [this.toTraceEvent(trace, event)]
    }

    if (this.isWorkflowEvent(event)) {
      const previous = this.findStep(trace, 'workflow')
      const previousDetail = previous?.detail || {}
      const previousSimple = Array.isArray(previousDetail.simple) ? previousDetail.simple : []
      const previousNodes = Array.isArray(previousDetail.nodes) ? previousDetail.nodes : []
      const simple = this.buildWorkflowSimple(event)
      this.upsertStep(trace, {
        id: 'workflow',
        type: 'workflow',
        title: '工作流执行',
        status: event.type === 'workflow_done' || event.type === 'node_end' ? 'done' : 'running',
        summary: simple.length ? simple[simple.length - 1].title : '工作流执行中',
        detail: {
          ...previousDetail,
          simple: [...previousSimple, ...simple],
          nodes: [...previousNodes, event.payload],
        },
      })
      return [this.toTraceEvent(trace, event)]
    }

    if (event.type === 'error') {
      trace.status = 'error'
      const traceEvent = this.toTraceEvent(trace, event)
      this.traces.delete(requestId)
      return [traceEvent]
    }

    if (event.type === 'done') {
      trace.status = 'done'
      const traceEvent = this.toTraceEvent(trace, event)
      this.traces.delete(requestId)
      return [traceEvent]
    }

    return []
  }

  // 取当前请求的 trace，没有则创建空轨迹。
  private getTrace(requestId: string): ExecutionTrace {
    if (!this.traces.has(requestId)) {
      this.traces.set(requestId, {
        capability: 'chat',
        summary: '普通对话',
        status: 'running',
        steps: [],
      })
    }
    return this.traces.get(requestId)!
  }

  // 根据 step id 查找已经存在的执行步骤。
  private findStep(trace: ExecutionTrace, id: string) {
    return trace.steps.find((item) => item.id === id)
  }

  // 根据 step id 更新或追加执行步骤。
  private upsertStep(trace: ExecutionTrace, step: ExecutionTraceStep) {
    const index = trace.steps.findIndex((item) => item.id === step.id)
    if (index >= 0) {
      trace.steps.splice(index, 1, { ...trace.steps[index], ...step })
      return
    }
    trace.steps.push(step)
  }

  // 生成前端可消费的 trace_update 事件。
  private toTraceEvent(trace: ExecutionTrace, event: AgentEvent): AgentTraceUpdateEvent {
    return {
      type: 'trace_update',
      payload: {
        executionTrace: {
          ...trace,
          steps: trace.steps.map((step) => ({ ...step })),
        },
      },
      metadata: event.metadata,
    }
  }

  // 归一化后端能力编码，避免前端再兜底猜测。
  private normalizeCapability(capability?: string): ExecutionTrace['capability'] {
    if (capability === 'rag' || capability === 'tool' || capability === 'workflow') return capability
    return 'chat'
  }

  // 转换执行能力的用户可读名称。
  private getCapabilityLabel(capability: ExecutionTrace['capability']) {
    const labels = {
      chat: '普通对话',
      rag: '知识库问答',
      tool: '工具调用',
      workflow: '工作流执行',
      mixed: '聚合回答',
    }
    return labels[capability]
  }

  // 从工作流事件中抽取普通用户可读的业务步骤。
  private buildWorkflowSimple(event: AgentWorkflowEvent) {
    const payload = event.payload
    return [{
      title: payload.name || payload.nodeKey || payload.workflowCode || '工作流节点',
      status: event.type === 'workflow_done' || event.type === 'node_end' ? 'done' : 'running',
    }]
  }

  // 判断事件是否属于工作流执行生命周期。
  private isWorkflowEvent(event: AgentEvent): event is AgentWorkflowEvent {
    return event.type.startsWith('workflow_') || event.type.startsWith('node_')
  }
}
