// 定义新版智能体运行时的统一上下文结构。
import { ChatMessage, LlmOptions } from '../llm/llm.service'
import { AgentRuntimeRequest } from '../agent-runtime.types'

export type AgentContext = {
  agent: {
    id: string
    code: string
    name: string
    mode: string
  }
  user: {
    id: string
    roles: string[]
    permissions: string[]
  }
  conversation: {
    id?: string
  }
  history: ChatMessage[]
  request: AgentRuntimeRequest
  prompt: {
    id: string
    system: string
  }
  model: LlmOptions
  capabilities: {
    knowledgeEnabled: boolean
    knowledgeStrict: boolean
    knowledgeBaseIds: string[]
    knowledgeTags: string[]
    toolCodes: string[]
    workflowCode?: string
  }
  execution: {
    stream: boolean
    temperature?: number
    topP?: number
    maxSteps: number
  }
  metadata: AgentRuntimeRequest['metadata']
}
