import { ChatMode } from '../../modules/knowledge-bot/chat/dto/chat.dto'
import { ChatMessage, LlmOptions } from '../llm/llm.service'
import { WorkflowStreamEvent } from '../workflow/workflow.types'

export type AgentPlanStepType = 'chat' | 'knowledge' | 'tool' | 'workflow'

export type AgentContext = {
  agentCode?: string
  agentName?: string
  model: {
    provider: string
    name?: string
    temperature?: number
    topP?: number
  }
  prompt: {
    id?: string
    system?: string
  }
  knowledge: {
    enabled: boolean
    ids: string[]
    tags: string[]
    strict: boolean
  }
  tools: string[]
  workflow?: {
    code: string
  }
  user: {
    id: string
    roles: string[]
  }
  conversation: {
    id: string
    history: ChatMessage[]
  }
  mode: ChatMode
  maxSteps: number
}

export type AgentPlan = {
  goal: string
  steps: AgentPlanStep[]
}

export type AgentPlanStep = {
  type: AgentPlanStepType
  action: string
  target?: string
  params: Record<string, unknown>
}

export type AgentRuntimeInput = {
  message: string
  userId: string
  mode: ChatMode
  history: ChatMessage[]
  conversationId: string
  userMessageId?: string
  agent?: AgentRuntimeConfig | null
  requestedToolCode?: string
}

export type AgentExecutionResult = {
  route: AgentPlanStepType
  answer: string
  sources: any[]
  workflowCode?: string
  plan: AgentPlan
  executionLogId?: string
}

export type AgentRuntimeStreamEvent =
  | { type: 'content'; content: string }
  | { type: 'sources'; sources: any[] }
  | WorkflowStreamEvent

export type AgentRuntimeStreamResult = {
  route: AgentPlanStepType
  sources: any[]
  answer: string
  workflowCode?: string
  plan: AgentPlan
  executionLogId?: string
}

export type AgentRuntimeStreamChunk = {
  event: AgentRuntimeStreamEvent
  state?: AgentRuntimeStreamResult
}

export type AgentRuntimeConfig = {
  agentCode?: string
  agentName?: string
  promptId?: string
  mode: ChatMode
  systemPrompt: string
  llmOptions: LlmOptions
  toolCodes: string[]
  knowledgeEnabled: boolean
  knowledgeStrict: boolean
  knowledgeTags: string[]
  knowledgeBaseIds: string[]
  workflowCode?: string
}

export type ExecutionLogStartInput = {
  conversationId?: string
  messageId?: string
  agentCode?: string
  plan: AgentPlan
}

export type ExecutionLogSuccessInput = {
  route: string
  durationMs: number
}

export type ExecutionLogFailedInput = {
  message: string
  durationMs: number
}

export interface ExecutionLogger {
  logStart(input: ExecutionLogStartInput): Promise<{ id: string }>
  logSuccess(id: string, result: ExecutionLogSuccessInput): Promise<void>
  logFailed(id: string, error: ExecutionLogFailedInput): Promise<void>
}
