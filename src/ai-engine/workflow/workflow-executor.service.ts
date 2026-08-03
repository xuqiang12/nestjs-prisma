import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import {
  buildKnowledgeFallbackAnswer,
  extractKnowledgeNumberTerms,
  KnowledgeAnswerFact,
  validateKnowledgeAnswer,
} from '../knowledge-answer.util'
import { DefaultToolExecutor } from '../tools/tool.executor'
import { LlmService } from '../llm/llm.service'
import { VectorStoreService } from '../vector/vector-store.service'
import { WorkflowExecutionInput, WorkflowExecutionResult, WorkflowGraph, WorkflowNode, WorkflowStreamEvent } from './workflow.types'
import { WorkflowRunLoggerService } from './workflow-run-logger.service'

const STRICT_KNOWLEDGE_MAX_DISTANCE = 0.45
const KNOWLEDGE_EVIDENCE_MAX_LENGTH = 6000
const STRICT_KNOWLEDGE_FALLBACK = '未找到相关制度。'
const KNOWLEDGE_ROLE_MARKER_PATTERN = /^\s*(user|assistant|system)\s*$/i
const KNOWLEDGE_FACT_SPLIT_PATTERN = /[。；;]+/

type WorkflowKnowledgeFact = KnowledgeAnswerFact

@Injectable()
export class WorkflowExecutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorStore: VectorStoreService,
    private readonly llmService: LlmService,
    private readonly toolExecutor: DefaultToolExecutor,
    private readonly runLogger: WorkflowRunLoggerService,
  ) {}

  async execute(graph: WorkflowGraph, input: WorkflowExecutionInput): Promise<WorkflowExecutionResult> {
    const values: Record<string, any> = {
      message: input.message,
      history: input.history || [],
    }
    const run = await this.runLogger.startRun({
      conversationId: (input as any).conversationId,
      agentCode: input.agentCode,
      workflowCode: input.workflowCode,
      input: { message: input.message },
    })

    try {
      const result = await this.executeNodes(graph, input, values, run.id)
      await this.runLogger.finishRun(run.id, {
        answer: result.answer,
        sources: result.sources,
      })
      return { ...result, runId: run.id }
    } catch (error) {
      await this.runLogger.failRun(run.id, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  async *streamExecute(graph: WorkflowGraph, input: WorkflowExecutionInput): AsyncIterable<WorkflowStreamEvent> {
    const values: Record<string, any> = {
      message: input.message,
      history: input.history || [],
    }
    const run = await this.runLogger.startRun({
      conversationId: (input as any).conversationId,
      agentCode: input.agentCode,
      workflowCode: input.workflowCode,
      input: { message: input.message },
    })

    try {
      yield { type: 'workflow_start', runId: run.id, workflowCode: input.workflowCode }
      this.ensureSingleStreamingLlmNode(graph)

      const nodeMap = new Map(graph.nodes.map((node) => [node.nodeKey, node]))
      let current = graph.nodes.find((node) => node.type === 'start')
      const visited = new Set<string>()

      while (current) {
        if (visited.has(current.nodeKey)) {
          throw new BadRequestException('工作流执行出现循环')
        }
        visited.add(current.nodeKey)

        yield { type: 'node_start', nodeKey: current.nodeKey, nodeType: current.type, name: current.name }
        let stepOutput: Record<string, any>
        try {
          if (current.type === 'llm') {
            stepOutput = yield* this.streamLlmNode(current, values, input)
          } else {
            stepOutput = await this.runNode(current, values, input)
          }
          await this.runLogger.logStep({
            runId: run.id,
            nodeKey: current.nodeKey,
            nodeType: current.type,
            status: 'success',
            input: { nodeKey: current.nodeKey },
            output: stepOutput,
          })
          yield { type: 'node_end', nodeKey: current.nodeKey, nodeType: current.type, output: stepOutput }
        } catch (error) {
          await this.runLogger.logStep({
            runId: run.id,
            nodeKey: current.nodeKey,
            nodeType: current.type,
            status: 'failed',
            input: { nodeKey: current.nodeKey },
            errorMessage: error instanceof Error ? error.message : String(error),
          })
          throw error
        }

        if (current.type === 'output') {
          const answer = values[current.config.outputField]
          const finalAnswer = answer === undefined || answer === null ? '' : String(answer)
          const sources = values.sources || []
          yield { type: 'sources', sources }
          yield { type: 'workflow_done', runId: run.id, answer: finalAnswer }
          await this.runLogger.finishRun(run.id, { answer: finalAnswer, sources })
          return
        }

        const nextKey = this.pickNextNodeKey(current, graph, values)
        current = nextKey ? nodeMap.get(nextKey) : undefined
      }

      throw new BadRequestException('工作流未产生输出')
    } catch (error) {
      await this.runLogger.failRun(run.id, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  private async executeNodes(
    graph: WorkflowGraph,
    input: WorkflowExecutionInput,
    values: Record<string, any>,
    runId: string,
  ): Promise<WorkflowExecutionResult> {
    const nodeMap = new Map(graph.nodes.map((node) => [node.nodeKey, node]))
    let current = graph.nodes.find((node) => node.type === 'start')
    const visited = new Set<string>()

    while (current) {
      if (visited.has(current.nodeKey)) {
        throw new BadRequestException('工作流执行出现循环')
      }
      visited.add(current.nodeKey)

      let stepOutput: Record<string, any>
      try {
        stepOutput = await this.runNode(current, values, input)
        await this.runLogger.logStep({
          runId,
          nodeKey: current.nodeKey,
          nodeType: current.type,
          status: 'success',
          input: { nodeKey: current.nodeKey },
          output: stepOutput,
        })
      } catch (error) {
        await this.runLogger.logStep({
          runId,
          nodeKey: current.nodeKey,
          nodeType: current.type,
          status: 'failed',
          input: { nodeKey: current.nodeKey },
          errorMessage: error instanceof Error ? error.message : String(error),
        })
        throw error
      }

      if (current.type === 'output') {
        const answer = values[current.config.outputField]
        return {
          answer: answer === undefined || answer === null ? '' : String(answer),
          sources: values.sources || [],
          values,
        }
      }

      const nextKey = this.pickNextNodeKey(current, graph, values)
      current = nextKey ? nodeMap.get(nextKey) : undefined
    }

    throw new BadRequestException('工作流未产生输出')
  }

  private async runNode(node: WorkflowNode, values: Record<string, any>, input: WorkflowExecutionInput) {
    const config = node.config || {}

    if (node.type === 'start') {
      values[config.inputField] = input.message
      return { [config.inputField]: input.message }
    }

    if (node.type === 'prompt') {
      const prompt = await this.prisma.aiPrompt.findFirst({
        where: { id: config.promptId, status: 1 },
      })
      if (!prompt) {
        throw new BadRequestException(`提示词不存在或未启用：${config.promptId}`)
      }
      const content = prompt.content
      values[config.outputField] = content
      return { [config.outputField]: content }
    }

    if (node.type === 'knowledge') {
      this.ensureToolAllowed('search_knowledge', input.allowedToolCodes)
      const query = this.readValue(values, config.queryField)
      const standaloneQuestion = this.buildStandaloneKnowledgeQuestion(String(query || ''), input.history || [])
      const matchedSources = await this.vectorStore.similaritySearch(standaloneQuestion, config.limit ? Number(config.limit) : 5, { tags: input.knowledgeTags, knowledgeBaseIds: input.knowledgeBaseIds })
      const sources = input.knowledgeStrict
        ? matchedSources.filter((item) => item.distance <= STRICT_KNOWLEDGE_MAX_DISTANCE)
        : matchedSources
      values[config.outputField] = sources
      values.sources = sources
      values.knowledgeFacts = this.buildKnowledgeFacts(sources)
      return { [config.outputField]: sources }
    }

    if (node.type === 'llm') {
      if (input.knowledgeStrict && Array.isArray(values.sources) && !values.sources.length) {
        values[config.outputField] = STRICT_KNOWLEDGE_FALLBACK
        return { [config.outputField]: STRICT_KNOWLEDGE_FALLBACK }
      }
      const messages = this.buildLlmMessages(config, values, input)
      const rawAnswer = await this.llmService.invokeWithMessages(messages, input.llmOptions)
      const userQuestion = String(this.readValue(values, config.userMessageField) || input.message || '')
      const answer = this.hasKnowledgeSources(values)
        ? this.ensureKnowledgeAnswer(rawAnswer, values.knowledgeFacts || [], userQuestion)
        : rawAnswer
      values[config.outputField] = answer
      return { [config.outputField]: answer }
    }

    if (node.type === 'tool') {
      this.ensureToolAllowed(config.toolCode, input.allowedToolCodes)
      const params = this.buildToolParams(config.toolCode, config.paramsField ? this.readValue(values, config.paramsField) : {}, input)
      const result = await this.toolExecutor.execute(config.toolCode, params || {})
      values[config.outputField] = result
      return { [config.outputField]: result }
    }

    if (node.type === 'condition') {
      return { matched: this.matchCondition(config, values) }
    }

    if (node.type === 'output') {
      return { [config.outputField]: this.readValue(values, config.outputField) }
    }

    throw new BadRequestException(`节点类型不支持：${node.type}`)
  }

  private async *streamLlmNode(node: WorkflowNode, values: Record<string, any>, input: WorkflowExecutionInput) {
    const config = node.config || {}
    if (input.knowledgeStrict && Array.isArray(values.sources) && !values.sources.length) {
      values[config.outputField] = STRICT_KNOWLEDGE_FALLBACK
      yield { type: 'content' as const, content: STRICT_KNOWLEDGE_FALLBACK }
      return { [config.outputField]: STRICT_KNOWLEDGE_FALLBACK }
    }
    const messages = this.buildLlmMessages(config, values, input)
    let answer = ''
    for await (const content of this.llmService.streamWithMessages(messages, input.llmOptions)) {
      answer += content
      if (!this.hasKnowledgeSources(values)) {
        yield { type: 'content' as const, content }
      }
    }
    if (this.hasKnowledgeSources(values)) {
      const userQuestion = String(this.readValue(values, config.userMessageField) || input.message || '')
      answer = this.ensureKnowledgeAnswer(answer, values.knowledgeFacts || [], userQuestion)
      yield { type: 'content' as const, content: answer }
    }
    values[config.outputField] = answer
    return { [config.outputField]: answer }
  }

  private buildLlmMessages(config: Record<string, any>, values: Record<string, any>, input: WorkflowExecutionInput) {
    const systemPrompt = config.systemPromptField ? this.readValue(values, config.systemPromptField) : undefined
    const userMessage = this.readValue(values, config.userMessageField)
    if (this.hasKnowledgeSources(values)) {
      return [
        { role: 'system' as const, content: this.buildKnowledgeSystemPrompt(String(systemPrompt || ''), values.knowledgeFacts || []) },
        { role: 'user' as const, content: this.buildStandaloneKnowledgeQuestion(String(userMessage || ''), input.history || []) },
      ]
    }
    return [
      ...(systemPrompt ? [{ role: 'system' as const, content: String(systemPrompt) }] : []),
      ...((input.history || []).filter((item) => item.role === 'user' || item.role === 'assistant') as any),
      { role: 'user' as const, content: String(userMessage || '') },
    ]
  }

  private hasKnowledgeSources(values: Record<string, any>) {
    return Array.isArray(values.sources)
  }

  private buildStandaloneKnowledgeQuestion(message: string, history: WorkflowExecutionInput['history'] = []) {
    const currentQuestion = message.trim()
    const userContext = (history || [])
      .filter((item) => item.role === 'user')
      .map((item) => item.content.trim())
      .filter((content) => content && content !== currentQuestion)
      .slice(-3)

    return [...userContext, currentQuestion].filter(Boolean).join('\n')
  }

  private buildKnowledgeSystemPrompt(systemPrompt: string, facts: WorkflowKnowledgeFact[]) {
    const evidence = this.buildKnowledgeEvidence(facts)
    return [
      systemPrompt,
      '你是知识库问答助手。',
      '优先根据事实依据回答；如果事实依据不足以回答，请明确说明知识库中没有足够信息。',
      '只能根据事实依据组织自然客服回答。不要复述事实依据编号，不要输出知识片段全文，不要输出 user/assistant/system。',
      '完整保留事实依据中的数字、期限、条件和否定结论；不要省略、截断或改写关键条件。',
      `事实依据：\n${evidence || '未检索到可用事实依据'}`,
    ].filter(Boolean).join('\n')
  }

  private buildKnowledgeEvidence(facts: WorkflowKnowledgeFact[]) {
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

  private buildKnowledgeFacts(sources: Array<{ content?: string }>) {
    return sources
      .flatMap((source) => this.splitKnowledgeFactTexts(this.compactKnowledgeContent(source.content || '')))
      .map((text) => ({
        text,
        requiredTerms: extractKnowledgeNumberTerms(text),
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

  private ensureKnowledgeAnswer(answer: string, facts: WorkflowKnowledgeFact[], question = '') {
    if (!validateKnowledgeAnswer(answer, facts)) {
      return buildKnowledgeFallbackAnswer(facts, question, STRICT_KNOWLEDGE_FALLBACK)
    }
    return answer.trim()
  }

  private ensureSingleStreamingLlmNode(graph: WorkflowGraph) {
    if (graph.nodes.filter((node) => node.type === 'llm').length > 1) {
      throw new BadRequestException('当前版本仅支持一个流式 LLM 节点')
    }
  }

  private pickNextNodeKey(node: WorkflowNode, graph: WorkflowGraph, values: Record<string, any>) {
    const edges = graph.edges
      .filter((edge) => edge.fromNodeKey === node.nodeKey)
      .sort((a, b) => (a.sortNo || 0) - (b.sortNo || 0))

    if (node.type !== 'condition') {
      return edges[0]?.toNodeKey
    }

    return edges.find((edge) => !edge.condition || this.matchCondition(edge.condition, values))?.toNodeKey
  }

  private matchCondition(condition: Record<string, any>, values: Record<string, any>) {
    const actual = this.readValue(values, condition.field)
    if (condition.operator === 'not_equals') {
      return actual !== condition.value
    }
    if (condition.operator === 'exists') {
      return actual !== undefined && actual !== null && actual !== ''
    }
    return actual === condition.value
  }

  private ensureToolAllowed(toolCode: string, allowedToolCodes: string[]) {
    if (!allowedToolCodes.includes(toolCode)) {
      throw new BadRequestException(`智能体未授权工具：${toolCode}`)
    }
  }

  private buildToolParams(toolCode: string, params: any, input: WorkflowExecutionInput) {
    const baseParams = params && typeof params === 'object' && !Array.isArray(params) ? params : {}
    if (toolCode === 'get_user_menu_permissions') {
      return { ...baseParams, userId: input.userId }
    }
    return baseParams
  }

  private readValue(values: Record<string, any>, field: string) {
    return field.split('.').reduce((current, key) => current?.[key], values)
  }

}
