// 定义 AI 工作流运行图、执行输入和流式事件类型。
import type { LlmOptions } from '../llm/llm.service'

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
  userId?: string
  history?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  agentCode: string
  workflowCode: string
  conversationId?: string
  allowedToolCodes: string[]
  knowledgeStrict?: boolean
  knowledgeTags?: string[]
  knowledgeBaseIds?: string[]
  llmOptions?: LlmOptions
}

export type WorkflowExecutionResult = {
  answer: string
  sources: any[]
  values: Record<string, any>
  runId?: string
}

export type WorkflowStreamEvent =
  | { type: 'workflow_start'; runId: string; workflowCode: string }
  | { type: 'node_start'; nodeKey: string; nodeType: string; name: string }
  | { type: 'node_end'; nodeKey: string; nodeType: string; output: Record<string, any> }
  | { type: 'content'; content: string }
  | { type: 'sources'; sources: any[] }
  | { type: 'workflow_done'; runId: string; answer: string }
