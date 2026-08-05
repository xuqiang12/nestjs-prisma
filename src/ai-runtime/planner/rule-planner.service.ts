// 基于明确规则生成新版智能体第一版执行计划。
import { Injectable } from '@nestjs/common'
import { CapabilityType } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { ExecutionPlan, ExecutionStep } from './agent-planner.types'

const KNOWLEDGE_INTENT_PATTERN = /(价格|多少钱|售价|费用|收费|收费标准|年费|套餐|订阅价|订阅|资费|政策|制度|售后|期限|知识库|产品|报价)/
const TOOL_INTENT_PATTERN = /(工具|查询工具|调用工具|weather|天气)/
const WORKFLOW_INTENT_PATTERN = /(工作流|流程|审批|自动处理|执行流程)/
const KNOWLEDGE_TOOL_CODE = 'search_knowledge'

@Injectable()
export class RulePlanner {
  // 根据用户问题和 Planner 可见能力生成第一版单步执行计划。
  plan(context: AgentContext, plannerView: CapabilityType[]): ExecutionPlan {
    return {
      metadata: { version: 1 },
      strategy: { mode: 'sequential' },
      steps: [this.createStep(context, plannerView)],
    }
  }

  // 按明确关键词和能力列表选择本次要进入的能力步骤。
  private createStep(context: AgentContext, plannerView: CapabilityType[]): ExecutionStep {
    const message = context.request.message.content
    if (this.hasCapability(plannerView, 'workflow') && WORKFLOW_INTENT_PATTERN.test(message)) {
      return {
        id: 'step_1',
        capability: 'workflow',
        reason: '用户问题显式触发已绑定工作流',
        input: { workflowCode: context.capabilities.workflowCode, message },
      }
    }
    if (this.hasCapability(plannerView, 'tool') && TOOL_INTENT_PATTERN.test(message)) {
      return {
        id: 'step_1',
        capability: 'tool',
        reason: '用户问题显式触发已授权工具',
        input: { toolCode: this.getFirstNormalToolCode(context), params: { message } },
      }
    }
    if (this.hasCapability(plannerView, 'rag') && KNOWLEDGE_INTENT_PATTERN.test(message)) {
      return {
        id: 'step_1',
        capability: 'rag',
        reason: '用户问题需要查询企业知识',
        input: { query: message },
      }
    }
    if (this.hasCapability(plannerView, 'chat')) {
      return {
        id: 'step_1',
        capability: 'chat',
        reason: '使用普通对话生成回答',
        input: { message },
      }
    }
    return {
      id: 'step_1',
      capability: plannerView[0],
      reason: '使用当前唯一可用能力处理请求',
      input: { message },
    }
  }

  // 判断 Planner 可见能力中是否包含指定能力。
  private hasCapability(plannerView: CapabilityType[], capability: CapabilityType) {
    return plannerView.includes(capability)
  }

  // 从上下文授权工具中取第一个普通工具编码。
  private getFirstNormalToolCode(context: AgentContext) {
    return context.capabilities.toolCodes.find((code) => code !== KNOWLEDGE_TOOL_CODE)
  }
}
