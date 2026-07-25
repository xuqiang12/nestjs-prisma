import { ChatMode } from '../../modules/knowledge-bot/chat/dto/chat.dto'
import { LlmOptions } from '../llm/llm.service'

export type AgentRuntimeConfig = {
  agentCode: string
  promptCode: string
  mode: ChatMode
  systemPrompt: string
  llmOptions: LlmOptions
  toolCodes: string[]
  workflowCode?: string
}
