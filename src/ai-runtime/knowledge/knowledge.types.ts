// 定义知识库问答运行时的证据、校验和返回结果类型。
import { ChatMessage, LlmOptions } from '../llm/llm.service'
import { SearchResult } from '../vector/vector-store.service'

export type ChatMode = 'chat' | 'knowledge'

export type KnowledgeFactType = 'TEXT' | 'NUMBER' | 'VERSION' | 'DURATION' | 'POLICY'

export type KnowledgeFact = {
  text: string
  type: KnowledgeFactType
  subject?: string
  attribute?: string
  condition?: string
  value?: string
  requiredTerms: string[]
  documentId?: string
  knowledgeBaseId?: string
  fileId?: string
  chunkIndex?: number
}

export type AnswerFact = {
  text: string
  type: KnowledgeFactType
  subject?: string
  attribute?: string
  condition?: string
  value?: string
}

export type FactAlignment = {
  answerFact: AnswerFact
  knowledgeFacts: KnowledgeFact[]
}

export type FactAlignmentResult = {
  items: FactAlignment[]
}

// 定义事实验证结果：SUPPORTED 表示知识库支持，CONTRADICTED 表示和知识库冲突，NOT_FOUND 表示无候选依据，UNCERTAIN 表示有候选但规则无法确定。
export type FactVerificationStatus = 'SUPPORTED' | 'CONTRADICTED' | 'NOT_FOUND' | 'UNCERTAIN'

export type FactVerificationResult = {
  answerFact: AnswerFact
  status: FactVerificationStatus
  knowledgeFacts: KnowledgeFact[]
}

export type FactVerificationSummary = {
  items: FactVerificationResult[]
}

// 定义 Grounding 执行决策：ALLOW 表示可放行，WARN 表示需警告但不自动改写，BLOCK 表示存在冲突事实但第一版仍不自动拒答。
export type GroundingDecision = 'ALLOW' | 'WARN' | 'BLOCK'

export type KnowledgeEvidenceItem = {
  sourceId: string
  content: string
  distance?: number
  metadata?: Record<string, any>
  documentId?: string
  knowledgeBaseId?: string
  fileId?: string
  chunkIndex?: number
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
  knowledgeStrict?: boolean
  knowledgeTags?: string[]
  knowledgeBaseIds?: string[]
}

export type KnowledgeRuntimeContext = {
  question: string
  originalQuestion?: string
  rewrittenQuestion?: string
  rewriteApplied?: boolean
  history: ChatMessage[]
  systemPrompt?: string
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
  answerFacts: AnswerFact[]
  factAlignment: FactAlignmentResult
  factVerification: FactVerificationSummary
  groundingDecision: GroundingDecision
  guardResult: KnowledgeGuardResult
  status: KnowledgeQAStatus
}
