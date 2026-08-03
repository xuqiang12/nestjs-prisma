import { BadRequestException, Injectable } from '@nestjs/common'
import { ChatMessage, LlmOptions, LlmService } from '../llm/llm.service'
import { SearchResult, VectorStoreService } from '../vector/vector-store.service'

export type ChatMode = 'chat' | 'knowledge'

export type CompletionPlan = {
  route: ChatMode
  messages: ChatMessage[]
  sources: SearchResult[]
  knowledgeFacts: KnowledgeFact[]
  directAnswer?: string
}

export type KnowledgeFact = {
  text: string
  requiredTerms: string[]
}

export type BuildCompletionOptions = {
  systemPrompt?: string
  allowedToolCodes?: string[]
  knowledgeStrict?: boolean
  knowledgeTags?: string[]
  knowledgeBaseIds?: string[]
}

const STRICT_KNOWLEDGE_MAX_DISTANCE = 0.45
const KNOWLEDGE_EVIDENCE_MAX_DISTANCE = 0.55
const KNOWLEDGE_EVIDENCE_MAX_LENGTH = 6000
const STRICT_KNOWLEDGE_FALLBACK = '未找到相关制度。'
const KNOWLEDGE_ROLE_MARKER_PATTERN = /^\s*(user|assistant|system)\s*$/i
const COPIED_KNOWLEDGE_ARTIFACT_PATTERN = /(知识片段|事实依据|来源\d*[:：])/
const KNOWLEDGE_FACT_SPLIT_PATTERN = /[。；;]+/
const KNOWLEDGE_REQUIRED_NUMBER_PATTERN = /\d+(?:\.\d+)?\s*(?:天|日|小时|分钟|个月|月|年|次|个|元|%|％)(?:\s*\/\s*(?:天|日|小时|分钟|个月|月|年|次|个|元|%|％))?(?:内|外|后|前|起|以上|以下)?/g
const KNOWLEDGE_REQUIRED_CONDITION_PATTERN = /(?:未|已|不|无|非|仅|只|必须|需要|可以|支持|不能|不得|禁止|无法)[\u4e00-\u9fa5A-Za-z0-9]{1,12}/g

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly llmService: LlmService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  // 执行普通聊天：构建普通对话消息后调用大模型，并返回本次路由类型。
  async chat(message: string) {
    const plan = await this.buildCompletion(message, 'chat')
    const answer = await this.complete(plan.messages)
    return { answer, route: plan.route }
  }

  // 执行普通聊天的流式输出：复用普通对话消息，只把模型返回的文本片段逐段交给上层。
  async *stream(message: string): AsyncIterable<string> {
    const plan = await this.buildCompletion(message, 'chat')
    for await (const content of this.streamCompletion(plan.messages)) {
      yield content
    }
  }

  // 执行知识库问答：先检索相似知识片段，再把知识上下文和用户问题一起交给模型。
  async rag(message: string) {
    const plan = await this.buildCompletion(message, 'knowledge')
    const rawAnswer = plan.directAnswer || await this.complete(plan.messages)
    const answer = this.ensureKnowledgeAnswer(rawAnswer, plan.knowledgeFacts)
    return { answer, route: 'rag', sources: plan.sources }
  }

  // 构建模型调用计划，统一处理普通聊天和知识库问答所需的消息上下文。
  async buildCompletion(
    message: string,
    mode: ChatMode = 'chat',
    history: ChatMessage[] = [],
    options: BuildCompletionOptions = {},
  ): Promise<CompletionPlan> {
    if (mode === 'knowledge') {
      this.ensureToolAllowed('search_knowledge', options.allowedToolCodes)
      const standaloneQuestion = this.buildStandaloneKnowledgeQuestion(message, history)
      // 知识库模式先用用户上下文补全检索问题，再把命中的片段整理为 system prompt 的事实依据。
      const matchedSources = await this.vectorStoreService.similaritySearch(standaloneQuestion, 5, { tags: options.knowledgeTags, knowledgeBaseIds: options.knowledgeBaseIds })
      const sources = options.knowledgeStrict
        ? matchedSources.filter((item) => item.distance <= STRICT_KNOWLEDGE_MAX_DISTANCE)
        : matchedSources.filter((item) => item.distance <= KNOWLEDGE_EVIDENCE_MAX_DISTANCE)
      if (options.knowledgeStrict && !sources.length) {
        return {
          route: 'knowledge',
          messages: [],
          sources: [],
          knowledgeFacts: [],
          directAnswer: STRICT_KNOWLEDGE_FALLBACK,
        }
      }
      const knowledgeFacts = this.buildKnowledgeFacts(sources)
      const evidence = this.buildKnowledgeEvidence(knowledgeFacts)
      const systemPrompt = [
        options.systemPrompt,
        '你是知识库问答助手。',
        options.knowledgeStrict
          ? '只能根据事实依据回答；如果事实依据不足以回答，只能回答“未找到相关制度。”'
          : '优先根据事实依据回答；如果事实依据不足以回答，请明确说明知识库中没有足够信息。',
        '只能根据事实依据组织自然客服回答。不要复述事实依据编号，不要输出知识片段全文，不要输出 user/assistant/system。',
        '完整保留事实依据中的数字、期限、条件和否定结论；不要省略、截断或改写关键条件。',
        `事实依据：\n${evidence || '未检索到可用事实依据'}`,
      ].filter(Boolean).join('\n')

      return {
        route: 'knowledge',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: standaloneQuestion }],
        sources,
        knowledgeFacts,
      }
    }

    return {
      route: 'chat',
      messages: [
        ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
        ...this.normalizeHistory(history),
        { role: 'user', content: message },
      ],
      sources: [],
      knowledgeFacts: [],
    }
  }

  // 根据已构建好的消息数组发起一次非流式模型调用。
  async complete(messages: ChatMessage[], options?: LlmOptions) {
    return this.llmService.invokeWithMessages(messages, this.withFinalAnswerOptions(options))
  }

  // 根据已构建好的消息数组发起一次流式模型调用。
  streamCompletion(messages: ChatMessage[], options?: LlmOptions) {
    return this.llmService.streamWithMessages(messages, this.withFinalAnswerOptions(options))
  }

  sanitizeKnowledgeAnswer(content: string) {
    return this.stripCopiedKnowledgeArtifacts(content.replace(/\uFFFD/g, '')).trim()
  }

  ensureKnowledgeAnswer(content: string, facts: KnowledgeFact[]) {
    const answer = this.sanitizeKnowledgeAnswer(content)
    return this.validateKnowledgeAnswer(answer, facts) ? answer : this.buildKnowledgeFallbackAnswer(facts)
  }

  private withFinalAnswerOptions(options: LlmOptions = {}): LlmOptions {
    return {
      ...options,
      finalAnswerGuard: true,
      roleTemplateStops: true,
    }
  }

  // 过滤历史消息，只保留模型支持的用户消息和助手消息。
  private normalizeHistory(history: ChatMessage[]) {
    return history.filter((item) => item.role === 'user' || item.role === 'assistant')
  }

  private buildStandaloneKnowledgeQuestion(message: string, history: ChatMessage[]) {
    const currentQuestion = message.trim()
    const userContext = this.normalizeHistory(history)
      .filter((item) => item.role === 'user')
      .map((item) => item.content.trim())
      .filter((content) => content && content !== currentQuestion)
      .slice(-3)

    return [...userContext, currentQuestion].filter(Boolean).join('\n')
  }

  private buildKnowledgeEvidence(facts: KnowledgeFact[]) {
    const evidence = facts
      .map((fact, index) => {
        const requiredTerms = fact.requiredTerms.length ? `\n关键条件：${fact.requiredTerms.join('、')}` : ''
        return `事实${index + 1}：${fact.text}${requiredTerms}`
      })
      .join('\n')

    return evidence.length > KNOWLEDGE_EVIDENCE_MAX_LENGTH
      ? `${evidence.slice(0, KNOWLEDGE_EVIDENCE_MAX_LENGTH)}...`
      : evidence
  }

  private buildKnowledgeFacts(sources: SearchResult[]) {
    return sources
      .flatMap((source) => this.splitKnowledgeFactTexts(this.compactKnowledgeContent(source.content)))
      .map((text) => ({
        text,
        requiredTerms: this.extractRequiredTerms(text),
      }))
      .filter((fact) => fact.text)
  }

  private compactKnowledgeContent(content: string) {
    const lines = content.replace(/\uFFFD/g, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line)
      .filter((line) => !KNOWLEDGE_ROLE_MARKER_PATTERN.test(line))

    return (lines.length ? lines : [content.trim()]).join('\n')
  }

  private splitKnowledgeFactTexts(content: string) {
    return content
      .split(KNOWLEDGE_FACT_SPLIT_PATTERN)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  private extractRequiredTerms(content: string) {
    return Array.from(new Set([
      ...this.extractKnowledgeNumberTerms(content),
      ...(content.match(KNOWLEDGE_REQUIRED_CONDITION_PATTERN) || []),
    ].map((term) => term.trim()).filter(Boolean)))
  }

  private validateKnowledgeAnswer(answer: string, facts: KnowledgeFact[]) {
    if (!answer) return !facts.length
    const answerNumberTerms = this.extractKnowledgeNumberTerms(answer)
    if (!answerNumberTerms.length) return true

    const factNumberTerms = new Set(
      facts
        .flatMap((fact) => this.extractKnowledgeNumberTerms(fact.text))
        .map((term) => this.normalizeKnowledgeTerm(term)),
    )
    if (!factNumberTerms.size) return true

    return answerNumberTerms.every((term) => factNumberTerms.has(this.normalizeKnowledgeTerm(term)))
  }

  private extractKnowledgeNumberTerms(content: string) {
    return Array.from(new Set((content.match(KNOWLEDGE_REQUIRED_NUMBER_PATTERN) || [])
      .map((term) => term.trim())
      .filter(Boolean)))
  }

  private normalizeKnowledgeTerm(content: string) {
    return content.replace(/\s+/g, '')
  }

  private buildKnowledgeFallbackAnswer(facts: KnowledgeFact[]) {
    const factLines = facts
      .filter((fact) => fact.text)
      .map((fact) => fact.text)
    if (!factLines.length) return STRICT_KNOWLEDGE_FALLBACK
    return [
      '您好，相关信息如下：',
      '',
      ...factLines.map((line, index) => `${index + 1}. ${line}`),
    ].join('\n')
  }

  private normalizeKnowledgeText(content: string) {
    return content.replace(/[\s,，.。:：;；、\-_*•]/g, '')
  }

  private stripCopiedKnowledgeArtifacts(content: string) {
    const sections = content.split(/\n\s*(?:-{3,}|_{3,}|\*{3,})\s*\n/)
    if (sections.length <= 1) return content

    const copiedIndex = sections.findIndex((section, index) => index > 0 && COPIED_KNOWLEDGE_ARTIFACT_PATTERN.test(section))
    return copiedIndex > 0 ? sections.slice(0, copiedIndex).join('\n').trim() : content
  }

  private ensureToolAllowed(toolCode: string, allowedToolCodes?: string[]) {
    if (allowedToolCodes && !allowedToolCodes.includes(toolCode)) {
      throw new BadRequestException(`智能体未授权工具：${toolCode}`)
    }
  }
}
