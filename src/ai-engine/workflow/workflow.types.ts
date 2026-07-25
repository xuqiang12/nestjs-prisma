export const WORKFLOW_NODE_TYPES = ['start', 'prompt', 'knowledge', 'llm', 'tool', 'condition', 'output'] as const

export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number]

export type WorkflowNodeConfig = Record<string, any>

export type WorkflowNode = {
  nodeKey: string
  type: string
  name: string
  config: WorkflowNodeConfig
  sortNo?: number
}

export type WorkflowEdge = {
  fromNodeKey: string
  toNodeKey: string
  condition?: Record<string, any>
  sortNo?: number
}

export type WorkflowGraph = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export type WorkflowExecutionInput = {
  message: string
  userId?: number
  history?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  agentCode: string
  workflowCode: string
  conversationId?: string
  allowedToolCodes: string[]
  llmOptions?: {
    model?: string
    temperature?: number
    topP?: number
  }
}

export type WorkflowExecutionResult = {
  answer: string
  sources: any[]
  values: Record<string, any>
  runId?: string
}
