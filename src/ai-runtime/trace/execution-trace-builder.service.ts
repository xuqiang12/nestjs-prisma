// 汇总运行时事件并生成可展示、可持久化的智能体执行轨迹。
import { Injectable } from '@nestjs/common'
import { AgentEvent } from '../events/agent-event.types'
import type { AgentWorkflowEvent } from '../events/agent-event.types'
import { ExecutionTrace, ExecutionTraceStep } from './execution-trace.types'

@Injectable()
export class ExecutionTraceBuilderService {
  // 从完整运行时事件列表生成最终执行轨迹，用于保存到历史消息。
  buildFinalTrace(events: AgentEvent[], fallbackQuestion: string): ExecutionTrace {
    const trace = this.createEmptyTrace()
    for (const event of events) {
      this.applyEvent(trace, event, fallbackQuestion)
    }
    this.ensureRewriteStep(trace, fallbackQuestion)
    this.finishComposeStep(trace)
    trace.status = trace.status === 'error' ? 'error' : 'done'
    return this.cloneTrace(trace)
  }

  // 把单个运行时事件合并进当前执行轨迹，用于实时流式展示。
  applyEvent(trace: ExecutionTrace, event: AgentEvent, fallbackQuestion = ''): ExecutionTrace | null {
    if (event.type === 'trace_update') return null

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
      this.ensureRewriteStep(trace, fallbackQuestion)
      return trace
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
      return trace
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
      return trace
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
      return trace
    }

    if (event.type === 'content') {
      this.upsertStep(trace, {
        id: 'compose',
        type: 'compose',
        title: '回答生成',
        status: 'running',
        summary: '正在生成回答',
      })
      return trace
    }

    if (event.type === 'error') {
      trace.status = 'error'
      return trace
    }

    if (event.type === 'done') {
      trace.status = 'done'
      this.finishComposeStep(trace)
      return trace
    }

    return null
  }

  // 创建空的执行轨迹对象，供实时和历史汇总共同使用。
  createEmptyTrace(): ExecutionTrace {
    return {
      capability: 'chat',
      summary: '普通对话',
      status: 'running',
      steps: [],
    }
  }

  // 复制执行轨迹，避免外部修改 requestId 缓存中的对象。
  cloneTrace(trace: ExecutionTrace): ExecutionTrace {
    return {
      ...trace,
      steps: trace.steps.map((step) => ({
        ...step,
        detail: step.detail ? { ...step.detail } : undefined,
      })),
    }
  }

  // 确保执行轨迹始终有问题改写展示步骤，没有真实改写时使用原问题。
  private ensureRewriteStep(trace: ExecutionTrace, fallbackQuestion: string) {
    if (this.findStep(trace, 'rewrite')) return
    const plan = this.findStep(trace, 'plan')
    const input = plan?.detail?.input || {}
    const originalQuestion = input.originalQuestion || fallbackQuestion || input.message || input.params?.message || input.query || ''
    const rewrittenQuestion = input.rewrittenQuestion || input.standaloneQuestion || originalQuestion
    const rewriteApplied = Boolean((input.rewrittenQuestion || input.standaloneQuestion) && rewrittenQuestion !== originalQuestion)
    this.upsertStep(trace, {
      id: 'rewrite',
      type: 'rewrite',
      title: '问题改写',
      status: 'done',
      summary: rewrittenQuestion,
      detail: {
        originalQuestion,
        rewrittenQuestion,
        rewriteApplied,
      },
    })
  }

  // 将回答生成步骤收尾为完成态，用于历史保存和流式 done 事件。
  private finishComposeStep(trace: ExecutionTrace) {
    const compose = this.findStep(trace, 'compose')
    if (compose) {
      this.upsertStep(trace, { ...compose, status: 'done', summary: compose.summary || '回答已生成' })
    }
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
