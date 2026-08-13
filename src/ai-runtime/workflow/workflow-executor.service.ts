// 执行 AI 运行时工作流节点并产出非流式或流式结果。
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { KnowledgeAnswerGuardService } from '../knowledge/knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from '../knowledge/knowledge-evidence.service'
import { KnowledgeFact } from '../knowledge/knowledge.types'
import { DefaultToolExecutor } from '../tools/default-tool.executor'
import { LlmService } from '../llm/llm.service'
import { VectorStoreService } from '../vector/vector-store.service'
import { WorkflowExecutionInput, WorkflowExecutionResult, WorkflowGraph, WorkflowNode, WorkflowStreamEvent } from './workflow.types'
import { WorkflowRunLoggerService } from './workflow-run-logger.service'
import { ToolResult } from '../tools/tool.types'

const STRICT_KNOWLEDGE_MAX_DISTANCE = 0.45
const STRICT_KNOWLEDGE_FALLBACK = '未找到相关制度。'

@Injectable()
export class WorkflowExecutorService {
  // 注入工作流执行所需的持久化、模型、检索、工具、日志和知识答案约束能力。
  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorStore: VectorStoreService,
    private readonly llmService: LlmService,
    private readonly toolExecutor: DefaultToolExecutor,
    private readonly runLogger: WorkflowRunLoggerService,
    private readonly evidenceService: KnowledgeEvidenceService,
    private readonly guardService: KnowledgeAnswerGuardService,
  ) {}

  // 执行完整工作流并返回最终 answer、sources、values 和 runId。
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

  // 以流式事件方式执行工作流，适配 Agent 工作流能力输出。
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

  // 按图结构顺序执行节点直到 output 节点产生最终结果。
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

  // 执行单个工作流节点并写入共享 values。
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
      // 工作流 knowledge 节点独立走向量检索，并复用 Agent 的知识库范围。
      const query = this.readValue(values, config.queryField)
      const standaloneQuestion = this.buildStandaloneKnowledgeQuestion(String(query || ''), input.history || [])
      const matchedSources = await this.vectorStore.similaritySearch(standaloneQuestion, config.limit ? Number(config.limit) : 5, { tags: input.knowledgeTags, knowledgeBaseIds: input.knowledgeBaseIds })
      const sources = input.knowledgeStrict
        ? matchedSources.filter((item) => item.distance <= STRICT_KNOWLEDGE_MAX_DISTANCE)
        : matchedSources
      const evidence = this.evidenceService.buildEvidence(sources)
      values[config.outputField] = sources
      values.sources = sources
      values.knowledgeEvidence = evidence
      values.knowledgeFacts = evidence.facts
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
      // tool 节点只规整节点参数并交给统一工具执行器处理。
      const toolInput = this.buildToolInput(config.paramsField ? this.readValue(values, config.paramsField) : {})
      const result = await this.toolExecutor.execute(config.toolCode, toolInput, this.buildToolRuntimeContext(input))
      const output = this.unwrapToolResult(result)
      values[config.outputField] = output
      return { [config.outputField]: output }
    }

    if (node.type === 'condition') {
      return { matched: this.matchCondition(config, values) }
    }

    if (node.type === 'output') {
      return { [config.outputField]: this.readValue(values, config.outputField) }
    }

    throw new BadRequestException(`节点类型不支持：${node.type}`)
  }

  // 流式执行 LLM 节点，知识库场景会先缓冲模型输出再执行事实校验。
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

  // 构建当前 LLM 节点要发送给模型的消息。
  private buildLlmMessages(config: Record<string, any>, values: Record<string, any>, input: WorkflowExecutionInput) {
    const systemPrompt = config.systemPromptField ? this.readValue(values, config.systemPromptField) : undefined
    const userMessage = this.readValue(values, config.userMessageField)
    if (this.hasKnowledgeSources(values)) {
      return [
        { role: 'system' as const, content: this.buildKnowledgeSystemPrompt(String(systemPrompt || ''), values.knowledgeFacts || [], values) },
        { role: 'user' as const, content: this.buildStandaloneKnowledgeQuestion(String(userMessage || ''), input.history || []) },
      ]
    }
    return [
      ...(systemPrompt ? [{ role: 'system' as const, content: String(systemPrompt) }] : []),
      ...((input.history || []).filter((item) => item.role === 'user' || item.role === 'assistant') as any),
      { role: 'user' as const, content: String(userMessage || '') },
    ]
  }

  // 判断当前工作流是否已经执行过知识库检索节点。
  private hasKnowledgeSources(values: Record<string, any>) {
    return Array.isArray(values.sources)
  }

  // 只拼接最近用户问题，避免助手历史污染知识检索意图。
  private buildStandaloneKnowledgeQuestion(message: string, history: WorkflowExecutionInput['history'] = []) {
    const currentQuestion = message.trim()
    const userContext = (history || [])
      .filter((item) => item.role === 'user')
      .map((item) => item.content.trim())
      .filter((content) => content && content !== currentQuestion)
      .slice(-3)

    return [...userContext, currentQuestion].filter(Boolean).join('\n')
  }

  // 构建知识库 LLM 节点使用的系统提示词。
  private buildKnowledgeSystemPrompt(systemPrompt: string, facts: KnowledgeFact[], values: Record<string, any>) {
    const evidence = this.evidenceService.buildPromptEvidence(values.knowledgeEvidence?.items || [])
    return [
      systemPrompt,
      '你是知识库问答助手。',
      '优先根据事实依据回答；如果事实依据不足以回答，请明确说明知识库中没有足够信息。',
      '只能根据事实依据组织自然客服回答。不要复述事实依据编号，不要输出知识片段全文，不要输出 user/assistant/system。',
      '完整保留事实依据中的数字、期限、条件和否定结论；不要省略、截断或改写关键条件。',
      `事实依据：\n${evidence || '未检索到可用事实依据'}`,
    ].filter(Boolean).join('\n')
  }

  // 使用知识答案 Guard 校验并在必要时生成事实兜底回答。
  private ensureKnowledgeAnswer(answer: string, facts: KnowledgeFact[], question = '') {
    return this.guardService.ensureAnswer(answer, facts, question)
  }

  // 限制当前流式工作流只包含一个 LLM 节点。
  private ensureSingleStreamingLlmNode(graph: WorkflowGraph) {
    if (graph.nodes.filter((node) => node.type === 'llm').length > 1) {
      throw new BadRequestException('当前版本仅支持一个流式 LLM 节点')
    }
  }

  // 根据当前节点和条件边选择下一个节点。
  private pickNextNodeKey(node: WorkflowNode, graph: WorkflowGraph, values: Record<string, any>) {
    const edges = graph.edges
      .filter((edge) => edge.fromNodeKey === node.nodeKey)
      .sort((a, b) => (a.sortNo || 0) - (b.sortNo || 0))

    if (node.type !== 'condition') {
      return edges[0]?.toNodeKey
    }

    return edges.find((edge) => !edge.condition || this.matchCondition(edge.condition, values))?.toNodeKey
  }

  // 判断条件节点或条件边是否命中。
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

  // 将 Workflow 节点参数规整为 Tool Input。
  private buildToolInput(params: any) {
    return params && typeof params === 'object' && !Array.isArray(params) ? params : {}
  }

  // 从 Workflow 运行输入构建工具运行时上下文。
  private buildToolRuntimeContext(input: WorkflowExecutionInput) {
    return {
      userId: input.userId || '',
      agentCode: input.agentCode,
      conversationId: input.conversationId,
    }
  }

  // 读取工具执行结果，失败时中断当前工作流。
  private unwrapToolResult(result: ToolResult) {
    if (!result.success) {
      const failure = result as Extract<ToolResult, { success: false }>
      throw new BadRequestException(failure.error.message)
    }
    return result.data
  }

  // 按点路径从 values 中读取节点字段。
  private readValue(values: Record<string, any>, field: string) {
    return field.split('.').reduce((current, key) => current?.[key], values)
  }

}
