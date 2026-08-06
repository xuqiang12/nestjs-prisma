// 定义知识库问答运行时的证据、校验和返回结果类型。
import { ChatMessage, LlmOptions } from '../llm/llm.service'
import { SearchResult } from '../vector/vector-store.service'

export type ChatMode = 'chat' | 'knowledge'

export type KnowledgeFact = {
  text: string
  requiredTerms: string[]
}

export type KnowledgeEvidenceItem = {
  sourceId: string
  content: string
  distance?: number
  metadata?: Record<string, any>
}

export type KnowledgeEvidence = {
  sources: SearchResult[]
  items: KnowledgeEvidenceItem[]
  facts: KnowledgeFact[]
}

export type KnowledgeGuardError = {
  code: string
  message: string
}

export type KnowledgeGuardResult = {
  passed: boolean
  errors: KnowledgeGuardError[]
}

export type KnowledgeQAStatus = 'answered' | 'insufficient_evidence' | 'unsupported' | 'rejected'

export type CompletionPlan = {
  route: ChatMode
  messages: ChatMessage[]
  sources: SearchResult[]
  knowledgeFacts: KnowledgeFact[]
  evidence: KnowledgeEvidence
  directAnswer?: string
}

export type BuildCompletionOptions = {
  systemPrompt?: string
  allowedToolCodes?: string[]
  knowledgeStrict?: boolean
  knowledgeTags?: string[]
  knowledgeBaseIds?: string[]
}

export type KnowledgeRuntimeContext = {
  question: string
  history: ChatMessage[]
  systemPrompt?: string
  allowedToolCodes?: string[]
  knowledgeStrict?: boolean
  knowledgeTags?: string[]
  knowledgeBaseIds?: string[]
  llmOptions?: LlmOptions
}

export type KnowledgeQAResult = {
  answer: string
  route: 'rag'
  sources: SearchResult[]
  evidence: KnowledgeEvidence
  guardResult: KnowledgeGuardResult
  status: KnowledgeQAStatus
}
