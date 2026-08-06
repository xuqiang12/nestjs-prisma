// 基于 AI 意图识别生成新版智能体第一版执行计划。
import { Injectable } from '@nestjs/common'
import { CapabilityType } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { IntentClassification, IntentClassifierService } from './intent-classifier.service'
import { ExecutionPlan, ExecutionStep } from './agent-planner.types'

const KNOWLEDGE_TOOL_CODE = 'search_knowledge'
const MIN_INTENT_CONFIDENCE = 0.6

@Injectable()
export class RulePlanner {
  // 注入 AI 意图识别器，Planner 只消费结构化意图结果。
  constructor(private readonly intentClassifier: IntentClassifierService) {}

  // 根据用户问题、Planner 可见能力和 AI 意图识别结果生成第一版单步执行计划。
  async plan(context: AgentContext, plannerView: CapabilityType[]): Promise<ExecutionPlan> {
    return {
      metadata: { version: 1 },
      strategy: { mode: 'sequential' },
      steps: [await this.createStep(context, plannerView)],
    }
  }

  // 按 AI 意图结果和能力列表选择本次要进入的能力步骤。
  private async createStep(context: AgentContext, plannerView: CapabilityType[]): Promise<ExecutionStep> {
    const message = context.request.message.content
    const classification = await this.classifyIntent(message, plannerView, context)
    const capability = this.resolveCapability(classification, plannerView)
    return this.createCapabilityStep(capability, message, context, classification)
  }

  // 调用 AI 意图识别器，识别失败时返回低置信度普通对话候选。
  private async classifyIntent(
    message: string,
    plannerView: CapabilityType[],
    context: AgentContext,
  ): Promise<IntentClassification> {
    try {
      return await this.intentClassifier.classify({
        message,
        availableCapabilities: plannerView,
        agent: context.agent,
        capabilities: context.capabilities,
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
  private resolveCapability(classification: IntentClassification, plannerView: CapabilityType[]) {
    if (
      classification.confidence >= MIN_INTENT_CONFIDENCE
      && plannerView.includes(classification.capability)
    ) {
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
  ): ExecutionStep {
    if (capability === 'workflow') {
      return {
        id: 'step_1',
        capability,
        reason: classification.reason || 'AI 意图识别选择已绑定工作流',
        input: { ...classification.input, workflowCode: context.capabilities.workflowCode, message },
      }
    }
    if (capability === 'tool') {
      return {
        id: 'step_1',
        capability,
        reason: classification.reason || 'AI 意图识别选择已授权工具',
        input: {
          ...classification.input,
          toolCode: this.getFirstNormalToolCode(context),
          params: { ...classification.input?.params, message },
        },
      }
    }
    if (capability === 'rag') {
      return {
        id: 'step_1',
        capability,
        reason: classification.reason || 'AI 意图识别选择查询企业知识',
        input: { query: message, ...classification.input },
      }
    }
    return {
      id: 'step_1',
      capability,
      reason: classification.reason || 'AI 意图识别选择普通对话',
      input: { ...classification.input, message },
    }
  }

  // 从上下文授权工具中取第一个普通工具编码。
  private getFirstNormalToolCode(context: AgentContext) {
    return context.capabilities.toolCodes.find((code) => code !== KNOWLEDGE_TOOL_CODE)
  }
}
