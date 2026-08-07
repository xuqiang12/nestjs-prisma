// 组织知识库检索、证据整理和最终答案约束的 RAG 问答运行时。
import { BadRequestException, Injectable } from '@nestjs/common'
import { ChatMessage, LlmOptions, LlmService } from '../llm/llm.service'
import { SearchResult, VectorStoreService } from '../vector/vector-store.service'
import { KnowledgeAnswerGuardService } from './knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from './knowledge-evidence.service'
import { CompletionPlan, KnowledgeFact, KnowledgeRuntimeContext } from './knowledge.types'

const STRICT_KNOWLEDGE_MAX_DISTANCE = 0.45
const KNOWLEDGE_EVIDENCE_MAX_DISTANCE = 0.55
const STRICT_KNOWLEDGE_FALLBACK = '未找到相关制度。'
const FOLLOW_UP_QUESTION_PATTERN = /(它|这个|那个|这些|那些|他们|它们|其|企业版|基础版|标准版|高级版|有没有|还有|呢|多少|价格|售价|售后|期限|怎么卖)/

@Injectable()
export class KnowledgeQAService {
  // 注入模型、向量检索、证据整理和答案校验服务以组成完整知识问答链路。
  constructor(
    private readonly llmService: LlmService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly evidenceService: KnowledgeEvidenceService,
    private readonly guardService: KnowledgeAnswerGuardService,
  ) {}

  // 执行知识库问答，并用答案 Guard 修正不被证据支持的数字事实。
  async answer(context: KnowledgeRuntimeContext) {
    const plan = await this.buildCompletion(context)
    const rawAnswer = plan.directAnswer || await this.llmService.invokeWithMessages(
      plan.messages,
      this.withFinalAnswerOptions(context.llmOptions),
    )
    const answer = this.guardService.ensureAnswer(rawAnswer, plan.knowledgeFacts, context.question)
    const guardResult = this.guardService.validate(rawAnswer, plan.knowledgeFacts)

    return {
      answer,
      route: 'rag' as const,
      sources: plan.sources,
      evidence: plan.evidence,
      guardResult,
      status: guardResult.passed ? 'answered' as const : 'rejected' as const,
    }
  }

  // 构建知识库回答所需的检索结果、证据事实和模型消息。
  async buildCompletion(context: KnowledgeRuntimeContext): Promise<CompletionPlan> {
    this.ensureToolAllowed('search_knowledge', context.allowedToolCodes)
    const standaloneQuestion = context.rewriteApplied
      ? context.question.trim()
      : this.buildRetrievalQuestion(context.question, context.history || [])
    const matchedSources = await this.vectorStoreService.similaritySearch(standaloneQuestion, 5, {
      tags: context.knowledgeTags,
      knowledgeBaseIds: context.knowledgeBaseIds,
    })
    const sources = this.filterSources(matchedSources, !!context.knowledgeStrict)

    if (context.knowledgeStrict && !sources.length) {
      return {
        route: 'knowledge',
        messages: [],
        sources: [],
        knowledgeFacts: [],
        evidence: { sources: [], items: [], facts: [] },
        directAnswer: STRICT_KNOWLEDGE_FALLBACK,
      }
    }

    const evidence = this.evidenceService.buildEvidence(sources)
    const knowledgeFacts = evidence.facts
    const promptEvidence = this.evidenceService.buildPromptEvidence(evidence.items)
    const systemPrompt = [
      context.systemPrompt,
      '你是知识库问答助手。',
      context.knowledgeStrict
        ? '只能根据事实依据回答；如果事实依据不足以回答，只能回答“未找到相关制度。”'
        : '优先根据事实依据回答；如果事实依据不足以回答，请明确说明知识库中没有足够信息。',
      '只能根据事实依据组织自然客服回答。不要复述事实依据编号，不要输出知识片段全文，不要输出 user/assistant/system。',
      '完整保留事实依据中的数字、期限、条件和否定结论；不要省略、截断或改写关键条件。',
      `事实依据：\n${promptEvidence || '未检索到可用事实依据'}`,
    ].filter(Boolean).join('\n')

    return {
      route: 'knowledge',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: this.buildAnswerQuestionPrompt(context, standaloneQuestion) }],
      sources,
      knowledgeFacts,
      evidence,
    }
  }

  // 构造知识库最终回答时的问题提示，同时保留用户原话和独立检索问题。
  private buildAnswerQuestionPrompt(context: KnowledgeRuntimeContext, standaloneQuestion: string) {
    const originalQuestion = context.originalQuestion || context.question
    const rewrittenQuestion = context.rewrittenQuestion || standaloneQuestion
    return [
      `用户原始问题：${originalQuestion}`,
      `上下文改写问题：${rewrittenQuestion}`,
      '请根据事实依据回答用户原始问题。',
    ].join('\n')
  }

  // 对外复用知识库答案校验后的安全回答生成机制。
  ensureAnswer(content: string, facts: KnowledgeFact[], question = '') {
    return this.guardService.ensureAnswer(content, facts, question)
  }

  // 清理模型答案里的角色模板和复制的知识片段痕迹。
  sanitizeAnswer(content: string) {
    return this.guardService.sanitize(content)
  }

  // 按知识库严格模式过滤向量召回结果的距离阈值。
  private filterSources(sources: SearchResult[], strict: boolean) {
    return strict
      ? sources.filter((item) => item.distance <= STRICT_KNOWLEDGE_MAX_DISTANCE)
      : sources.filter((item) => item.distance <= KNOWLEDGE_EVIDENCE_MAX_DISTANCE)
  }

  // 根据当前问题是否为追问决定是否拼接最近用户历史作为检索问题。
  private buildRetrievalQuestion(message: string, history: ChatMessage[]) {
    const currentQuestion = message.trim()
    if (!this.shouldUseHistory(currentQuestion)) {
      return currentQuestion
    }

    const userContext = this.normalizeHistory(history)
      .filter((item) => item.role === 'user')
      .map((item) => item.content.trim())
      .filter((content) => content && content !== currentQuestion)
      .slice(-3)

    return [...userContext, currentQuestion].filter(Boolean).join('\n')
  }

  // 判断当前问题是否需要借助上文才能表达完整检索意图。
  private shouldUseHistory(question: string) {
    return FOLLOW_UP_QUESTION_PATTERN.test(question)
  }

  // 只保留用户和助手历史，供追问判断时进一步筛选用户消息。
  private normalizeHistory(history: ChatMessage[]) {
    return history.filter((item) => item.role === 'user' || item.role === 'assistant')
  }

  // 为知识库最终答案显式启用输出保护和角色模板停止词。
  private withFinalAnswerOptions(options: LlmOptions = {}): LlmOptions {
    return {
      ...options,
      finalAnswerGuard: true,
      roleTemplateStops: true,
    }
  }

  // 校验当前 Agent 是否允许执行知识检索工具。
  private ensureToolAllowed(toolCode: string, allowedToolCodes?: string[]) {
    if (allowedToolCodes && !allowedToolCodes.includes(toolCode)) {
      throw new BadRequestException(`智能体未授权工具：${toolCode}`)
    }
  }
}
