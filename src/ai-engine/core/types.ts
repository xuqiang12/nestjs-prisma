export interface WorkflowContext {
  input: string
  sessionId?: string
  state?: Record<string, any>
  output?: any
}

export interface Workflow {
  name: string
  run(context: WorkflowContext): Promise<WorkflowContext>
}

export interface RouteResult {
  workflow: string
  confidence: number
  reason?: string
}
