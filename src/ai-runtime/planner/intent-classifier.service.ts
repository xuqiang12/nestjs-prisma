// 使用大模型识别新版智能体本次请求应进入的能力。
import { Injectable } from '@nestjs/common'
import { CapabilityType } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { RuntimeLlmClientService } from '../llm/runtime-llm-client.service'

export type IntentClassifierInput = {
  message: string
  availableCapabilities: CapabilityType[]
  agent: AgentContext['agent']
  capabilities: AgentContext['capabilities']
}

export type IntentClassification = {
  capability: CapabilityType
  confidence: number
  reason?: string
  input?: Record<string, any>
}

const DEFAULT_CONFIDENCE = 0

@Injectable()
export class IntentClassifierService {
  // 注入运行时本地模型客户端，避免 Planner 直接依赖 ai-engine 服务。
  constructor(private readonly llmClient: RuntimeLlmClientService) {}

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
      '只输出 JSON，不要输出解释性文本。',
      'JSON 格式：{"capability":"chat|rag|tool|workflow","confidence":0到1之间的数字,"reason":"一句中文原因","input":{}}',
    ].join('\n')
  }

  // 构造包含当前请求和授权边界的用户提示词。
  private buildUserPrompt(input: IntentClassifierInput) {
    return JSON.stringify({
      message: input.message,
      agent: input.agent,
      availableCapabilities: input.availableCapabilities,
      capabilities: input.capabilities,
    })
  }

  // 从模型文本中解析结构化意图结果。
  private parseClassification(content: string): IntentClassification {
    const parsed = JSON.parse(this.extractJson(content))
    return {
      capability: parsed.capability,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : DEFAULT_CONFIDENCE,
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      input: parsed.input && typeof parsed.input === 'object' ? parsed.input : undefined,
    }
  }

  // 提取模型返回中的 JSON 对象文本。
  private extractJson(content: string) {
    const trimmed = content.trim()
    const match = trimmed.match(/\{[\s\S]*\}/)
    return match ? match[0] : trimmed
  }
}
