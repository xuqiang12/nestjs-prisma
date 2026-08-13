// 使用大模型识别新版智能体本次请求应进入的能力。
import { Injectable } from '@nestjs/common'
import { CapabilityType, PlannerToolDefinition } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { ChatMessage } from '../llm/llm.service'
import { LlmService } from '../llm/llm.service'
import { ToolCallPlan, ToolExecutionRecord } from './agent-planner.types'

export type IntentClassifierInput = {
  message: string
  availableCapabilities: CapabilityType[]
  plannerToolCatalog: PlannerToolDefinition[]
  agent: AgentContext['agent']
  history?: ChatMessage[]
  toolResults?: ToolExecutionRecord[]
}

export type IntentClassification = {
  capability: CapabilityType
  confidence: number
  toolCode?: string
  toolCalls?: ToolCallPlan[]
  reason?: string
  input?: Record<string, any>
}

const DEFAULT_CONFIDENCE = 0

@Injectable()
export class IntentClassifierService {
  // 注入统一运行时模型服务，避免 Planner 保留第二套模型客户端。
  constructor(private readonly llmClient: LlmService) {}

  // 让模型在可用能力范围内返回结构化意图结果，失败时交给 Planner 降级。
  async classify(input: IntentClassifierInput, context: AgentContext): Promise<IntentClassification> {
    const content = await this.llmClient.invokeWithMessages([
      { role: 'system', content: this.buildSystemPrompt(input.availableCapabilities) },
      { role: 'user', content: this.buildUserPrompt(input) },
    ], {
      ...context.model,
      temperature: 0,
      topP: 0.1,
      roleTemplateStops: true,
    })

    return this.parseClassification(content)
  }

  // 构造只允许输出 JSON 的意图识别系统提示词。
  private buildSystemPrompt(availableCapabilities: CapabilityType[]) {
    return [
      '你负责判断用户本次请求应该进入哪个智能体能力。',
      `只能从这些能力中选择：${availableCapabilities.join(', ')}`,
      'chat 表示普通对话；rag 表示需要查询企业知识库；tool 表示需要调用已授权工具；workflow 表示需要执行已绑定工作流。',
      '输入里的 currentMessage 是用户本轮原始问题；recentHistory 是不含本轮问题的最近上下文。',
      '需要结合 recentHistory 判断 currentMessage 是否是追问；如果是追问，把它改写成可独立执行的问题。',
      '如果 currentMessage 省略了主体、对象、产品或场景，必须从 recentHistory 最近明确话题中补全。',
      '示例：recentHistory 最后话题是“智能办公助手Pro多少钱一年”，currentMessage 是“售后怎么样”，rewrittenQuestion 应为“智能办公助手Pro 的售后政策是什么？”，rewriteApplied 应为 true。',
      'input.originalQuestion 必须是用户本轮原始问题；input.rewrittenQuestion 必须是可独立执行的问题；input.rewriteApplied 表示是否真实改写；input.query 优先等于 rewrittenQuestion。',
      '只输出 JSON，不要输出解释性文本。',
      '如果选择 tool，可以从 plannerToolCatalog 中选择一个或多个必要工具，输出 toolCalls 数组；每项必须包含 toolCode 和 params。',
      '如果 toolResults 已有工具执行结果，必须先判断是否足够回答用户；足够时选择 chat，不足时才继续选择 tool。',
      'toolResults 中 success=false 表示工具失败，只能作为上下文判断下一步，不能自动重试、改用兜底策略或重新规划。',
      'toolCalls 的 toolCode 只能来自 plannerToolCatalog；params 只能包含对应 inputSchema 描述的 Tool Input。',
      'tool input 不得包含 userId、agentCode、conversationId、requestId、traceId、signal。',
      'JSON 格式：{"capability":"chat|rag|tool|workflow","confidence":0到1之间的数字,"toolCalls":[{"toolCode":"工具 code","params":{"字段":"值"}}],"toolCode":"兼容旧格式的单工具 code","reason":"一句中文原因","input":{"originalQuestion":"用户原问题","rewrittenQuestion":"上下文改写问题","rewriteApplied":true或false,"query":"用于检索的问题或工具输入字段"}}',
    ].join('\n')
  }

  // 构造包含当前请求和授权边界的用户提示词。
  private buildUserPrompt(input: IntentClassifierInput) {
    const recentHistory = [...(input.history || [])]
    while (
      recentHistory.length
      && recentHistory[recentHistory.length - 1].role === 'user'
      && recentHistory[recentHistory.length - 1].content.trim() === input.message.trim()
    ) {
      recentHistory.pop()
    }

    return JSON.stringify({
      currentMessage: input.message,
      recentHistory,
      agent: input.agent,
      availableCapabilities: input.availableCapabilities,
      plannerToolCatalog: input.plannerToolCatalog,
      toolResults: input.toolResults || [],
    })
  }

  // 从模型文本中解析结构化意图结果。
  private parseClassification(content: string): IntentClassification {
    const parsed = JSON.parse(this.extractJson(content))
    return {
      capability: parsed.capability,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : DEFAULT_CONFIDENCE,
      toolCode: typeof parsed.toolCode === 'string' ? parsed.toolCode : undefined,
      toolCalls: this.parseToolCalls(parsed.toolCalls),
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      input: parsed.input && typeof parsed.input === 'object' ? parsed.input : undefined,
    }
  }

  // 解析模型返回的多工具调用计划，非法项交给 Planner 后续过滤。
  private parseToolCalls(value: unknown): ToolCallPlan[] | undefined {
    if (!Array.isArray(value)) {
      return undefined
    }
    return value
      .filter((item) => item && typeof item === 'object' && typeof (item as any).toolCode === 'string')
      .map((item) => ({
        toolCode: String((item as any).toolCode),
        params: (item as any).params && typeof (item as any).params === 'object' && !Array.isArray((item as any).params)
          ? (item as any).params
          : {},
      }))
  }

  // 提取模型返回中的 JSON 对象文本。
  private extractJson(content: string) {
    const trimmed = content.trim()
    const match = trimmed.match(/\{[\s\S]*\}/)
    return match ? match[0] : trimmed
  }
}
