// 定义新版智能体运行时的协议无关事件结构。
import type { ExecutionTrace } from '../trace/execution-trace.types'
export type AgentEventMetadata = {
  requestId?: string
  timestamp?: string
  stepId?: string
  capability?: string
  agentCode?: string
  promptId?: string
  workflowCode?: string
}

export type AgentContentEvent = {
  type: 'content'
  payload: {
    text: string
  }
  metadata: AgentEventMetadata
}

export type AgentSourcesEvent = {
  type: 'sources'
  payload: {
    sources: any[]
  }
  metadata: AgentEventMetadata
}

export type AgentErrorEvent = {
  type: 'error'
  payload: {
    code: string
    message: string
  }
  metadata: AgentEventMetadata
}

export type AgentDoneEvent = {
  type: 'done'
  payload: Record<string, never>
  metadata: AgentEventMetadata
}

export type AgentPlanEvent = {
  type: 'plan'
  payload: {
    plan: Record<string, any>
    plannerView: string[]
  }
  metadata: AgentEventMetadata
}

export type AgentWorkflowEvent = {
  type: `workflow_${string}` | `node_${string}`
  payload: Record<string, any>
  metadata: AgentEventMetadata
}

export type AgentToolEvent = {
  type: 'tool_start' | 'tool_done'
  payload: {
    tool: {
      code: string
      params?: Record<string, any>
      result?: any
    }
  }
  metadata: AgentEventMetadata
}

export type AgentTraceUpdateEvent = {
  type: 'trace_update'
  payload: {
    executionTrace: ExecutionTrace
  }
  metadata: AgentEventMetadata
}

export type AgentEvent =
  | AgentContentEvent
  | AgentSourcesEvent
  | AgentErrorEvent
  | AgentDoneEvent
  | AgentPlanEvent
  | AgentToolEvent
  | AgentWorkflowEvent
  | AgentTraceUpdateEvent
