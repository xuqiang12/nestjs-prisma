export interface WorkflowContext {
  input: string
  sessionId?: string
  state?: Record<string, any>
  output?: any
}

export interface Workflow {
  name: string
  // 执行工作流，并返回更新后的上下文。
  run(context: WorkflowContext): Promise<WorkflowContext>
}

export interface RouteResult {
  workflow: string
  confidence: number
  reason?: string
}
