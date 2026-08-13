// 基于 AI 意图识别生成新版智能体第一版执行计划。
import { Injectable } from '@nestjs/common'
import { CapabilityType, PlannerToolDefinition } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { IntentClassification, IntentClassifierService } from './intent-classifier.service'
import { ExecutionPlan, ExecutionStep, ToolCallPlan, ToolExecutionRecord } from './agent-planner.types'

const MIN_INTENT_CONFIDENCE = 0.6
const RUNTIME_CONTEXT_FIELDS = new Set(['userId', 'agentCode', 'conversationId', 'requestId', 'traceId', 'signal'])

@Injectable()
export class RulePlanner {
  // 注入 AI 意图识别器，Planner 只消费结构化意图结果。
  constructor(private readonly intentClassifier: IntentClassifierService) {}

  // 根据用户问题、Planner 可见能力和 AI 意图识别结果生成第一版单步执行计划。
  async plan(
    context: AgentContext,
    plannerView: CapabilityType[],
    plannerToolCatalog: PlannerToolDefinition[] = [],
    toolResults: ToolExecutionRecord[] = [],
  ): Promise<ExecutionPlan> {
    return {
      metadata: { version: 1 },
      strategy: { mode: 'sequential' },
      steps: [await this.createStep(context, plannerView, plannerToolCatalog, toolResults)],
    }
  }

  // 按 AI 意图结果和能力列表选择本次要进入的能力步骤。
  private async createStep(
    context: AgentContext,
    plannerView: CapabilityType[],
    plannerToolCatalog: PlannerToolDefinition[],
    toolResults: ToolExecutionRecord[],
  ): Promise<ExecutionStep> {
    const message = context.message.content
    const classification = await this.classifyIntent(message, plannerView, plannerToolCatalog, context, toolResults)
    const capability = this.resolveCapability(classification, plannerView, plannerToolCatalog)
    return this.createCapabilityStep(capability, message, context, classification, plannerToolCatalog, toolResults)
  }

  // 调用 AI 意图识别器，识别失败时返回低置信度普通对话候选。
  private async classifyIntent(
    message: string,
    plannerView: CapabilityType[],
    plannerToolCatalog: PlannerToolDefinition[],
    context: AgentContext,
    toolResults: ToolExecutionRecord[],
  ): Promise<IntentClassification> {
    try {
      return await this.intentClassifier.classify({
        message,
        availableCapabilities: plannerView,
        plannerToolCatalog,
        agent: context.agent,
        history: context.history,
        toolResults,
      }, context)
    } catch {
      return {
        capability: plannerView.includes('chat') ? 'chat' : plannerView[0],
        confidence: 0,
        reason: 'AI 意图识别失败，使用普通对话处理',
        input: { message },
      }
    }
  }

  // 判断 AI 返回能力是否可信且处于 Planner 可见能力范围内。
  private resolveCapability(
    classification: IntentClassification,
    plannerView: CapabilityType[],
    plannerToolCatalog: PlannerToolDefinition[],
  ) {
    if (
      classification.confidence >= MIN_INTENT_CONFIDENCE
      && plannerView.includes(classification.capability)
    ) {
      if (classification.capability === 'tool' && !this.resolveToolCalls(classification, plannerToolCatalog).length) {
        return plannerView.includes('chat') ? 'chat' : plannerView[0]
      }
      return classification.capability
    }
    return plannerView.includes('chat') ? 'chat' : plannerView[0]
  }

  // 根据最终能力生成执行器可消费的单步计划。
  private createCapabilityStep(
    capability: CapabilityType,
    message: string,
    context: AgentContext,
    classification: IntentClassification,
    plannerToolCatalog: PlannerToolDefinition[],
    toolResults: ToolExecutionRecord[],
  ): ExecutionStep {
    const questionInput = this.buildQuestionInput(message, classification)
    if (capability === 'workflow') {
      return {
        id: 'step_1',
        capability,
        reason: classification.reason || 'AI 意图识别选择已绑定工作流',
        input: { ...classification.input, ...questionInput, workflowCode: context.capabilities.workflowCode, message: questionInput.rewrittenQuestion },
      }
    }
    if (capability === 'tool') {
      const toolCalls = this.resolveToolCalls(classification, plannerToolCatalog)
      if (!toolCalls.length) {
        return this.createChatStep(message, classification, toolResults)
      }
      const firstToolCall = toolCalls[0]
      return {
        id: 'step_1',
        capability,
        reason: classification.reason || 'AI 意图识别选择已授权工具',
        input: {
          ...questionInput,
          toolCode: firstToolCall.toolCode,
          params: firstToolCall.params,
          toolCalls,
        },
      }
    }
    if (capability === 'rag') {
      return {
        id: 'step_1',
        capability,
        reason: classification.reason || 'AI 意图识别选择查询企业知识',
        input: { ...classification.input, ...questionInput, query: questionInput.rewrittenQuestion },
      }
    }
    return this.createChatStep(message, classification, toolResults)
  }

  // 构造普通对话步骤作为低置信度或非法工具选择的安全返回。
  private createChatStep(message: string, classification: IntentClassification, toolResults: ToolExecutionRecord[] = []): ExecutionStep {
    const questionInput = this.buildQuestionInput(message, classification)
    return {
      id: 'step_1',
      capability: 'chat',
      reason: classification.reason || 'AI 意图识别选择普通对话',
      input: { ...classification.input, ...questionInput, message: questionInput.rewrittenQuestion, toolResults },
    }
  }

  // 构造所有能力共用的问题改写字段，保证执行和展示使用同一组语义。
  private buildQuestionInput(message: string, classification: IntentClassification) {
    const input = classification.input || {}
    const originalQuestion = typeof input.originalQuestion === 'string' && input.originalQuestion.trim()
      ? input.originalQuestion.trim()
      : message
    const rewrittenCandidate = typeof input.rewrittenQuestion === 'string' && input.rewrittenQuestion.trim()
      ? input.rewrittenQuestion.trim()
      : typeof input.standaloneQuestion === 'string' && input.standaloneQuestion.trim()
        ? input.standaloneQuestion.trim()
        : originalQuestion
    const rewriteApplied = Boolean(input.rewriteApplied && rewrittenCandidate !== originalQuestion)

    return {
      originalQuestion,
      rewrittenQuestion: rewrittenCandidate,
      rewriteApplied,
    }
  }

  // 根据模型输出的 toolCalls 或旧 toolCode 生成可执行工具调用列表。
  private resolveToolCalls(classification: IntentClassification, plannerToolCatalog: PlannerToolDefinition[]): ToolCallPlan[] {
    const requestedToolCalls = Array.isArray(classification.toolCalls) && classification.toolCalls.length
      ? classification.toolCalls
      : this.resolveLegacyToolCall(classification)
    const resolvedToolCalls: ToolCallPlan[] = []

    for (const toolCall of requestedToolCalls) {
      const tool = plannerToolCatalog.find((item) => item.code === toolCall.toolCode.trim())
      if (!tool) {
        return []
      }
      const params = this.buildToolInput(toolCall.params, tool)
      if (!this.isValidToolInput(params, tool)) {
        return []
      }
      resolvedToolCalls.push({ toolCode: tool.code, params })
    }

    return resolvedToolCalls
  }

  // 将旧版 toolCode + input 归一化为单个 ToolCall。
  private resolveLegacyToolCall(classification: IntentClassification): ToolCallPlan[] {
    if (typeof classification.toolCode !== 'string' || !classification.toolCode.trim()) {
      return []
    }
    return [{ toolCode: classification.toolCode.trim(), params: classification.input || {} }]
  }

  // 从模型输出中提取 Tool Input，并剔除运行时上下文字段。
  private buildToolInput(input: Record<string, any> | undefined, tool: PlannerToolDefinition) {
    const source = input && typeof input === 'object' && !Array.isArray(input)
      ? input
      : {}
    const allowedProperties = tool.inputSchema.properties || {}
    return Object.entries(source).reduce<Record<string, unknown>>((result, [key, value]) => {
      if (RUNTIME_CONTEXT_FIELDS.has(key)) {
        return result
      }
      if (Object.prototype.hasOwnProperty.call(allowedProperties, key)) {
        result[key] = value
      }
      return result
    }, {})
  }

  // 执行最小 Tool Input Schema 校验，覆盖 required 和基础类型。
  private isValidToolInput(input: Record<string, unknown>, tool: PlannerToolDefinition) {
    const schema = tool.inputSchema
    const required = schema.required || []
    if (required.some((field) => input[field] === undefined || input[field] === null || input[field] === '')) {
      return false
    }
    return Object.entries(input).every(([key, value]) => {
      const property = schema.properties?.[key]
      if (!property) {
        return false
      }
      if (property.type === 'array') {
        return Array.isArray(value)
      }
      if (property.type === 'integer') {
        return Number.isInteger(value)
      }
      if (property.type === 'number') {
        return typeof value === 'number'
      }
      return typeof value === property.type
    })
  }
}
