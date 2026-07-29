import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { DefaultToolExecutor } from '../tools/tool.executor'
import { LlmService } from '../llm/llm.service'
import { VectorStoreService } from '../vector/vector-store.service'
import { WorkflowExecutionInput, WorkflowExecutionResult, WorkflowGraph, WorkflowNode, WorkflowStreamEvent } from './workflow.types'
import { WorkflowRunLoggerService } from './workflow-run-logger.service'

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
        where: { code: config.promptCode, status: 1 },
      })
      if (!prompt) {
        throw new BadRequestException(`提示词不存在或未启用：${config.promptCode}`)
      }
      const content = prompt.content
      values[config.outputField] = content
      return { [config.outputField]: content }
    }

    if (node.type === 'knowledge') {
      this.ensureToolAllowed('search_knowledge', input.allowedToolCodes)
      const query = this.readValue(values, config.queryField)
      const sources = await this.vectorStore.similaritySearch(String(query || ''), config.limit ? Number(config.limit) : 5)
      values[config.outputField] = sources
      values.sources = sources
      return { [config.outputField]: sources }
    }

    if (node.type === 'llm') {
      const messages = this.buildLlmMessages(config, values, input)
      const answer = await this.llmService.invokeWithMessages(messages, input.llmOptions)
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
    const messages = this.buildLlmMessages(config, values, input)
    let answer = ''
    for await (const content of this.llmService.streamWithMessages(messages, input.llmOptions)) {
      answer += content
      yield { type: 'content' as const, content }
    }
    values[config.outputField] = answer
    return { [config.outputField]: answer }
  }

  private buildLlmMessages(config: Record<string, any>, values: Record<string, any>, input: WorkflowExecutionInput) {
    const systemPrompt = config.systemPromptField ? this.readValue(values, config.systemPromptField) : undefined
    const userMessage = this.readValue(values, config.userMessageField)
    return [
      ...(systemPrompt ? [{ role: 'system' as const, content: String(systemPrompt) }] : []),
      ...((input.history || []).filter((item) => item.role === 'user' || item.role === 'assistant') as any),
      { role: 'user' as const, content: String(userMessage || '') },
    ]
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
