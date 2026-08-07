// 定义前端展示本轮智能体执行详情的统一结构。
export type ExecutionTraceCapability = 'chat' | 'rag' | 'tool' | 'workflow' | 'mixed'
export type ExecutionTraceStatus = 'pending' | 'running' | 'done' | 'error'

export type ExecutionTraceStep = {
  id: string
  type: 'plan' | 'rewrite' | 'rag' | 'tool' | 'workflow' | 'compose'
  title: string
  status: ExecutionTraceStatus
  summary?: string
  detail?: Record<string, any>
}

export type ExecutionTrace = {
  capability: ExecutionTraceCapability
  summary: string
  status: ExecutionTraceStatus
  steps: ExecutionTraceStep[]
}
