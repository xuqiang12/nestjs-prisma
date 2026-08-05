// 校验新版智能体执行计划是否只使用已授权能力。
import { BadRequestException, Injectable } from '@nestjs/common'
import { CapabilityType } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { ExecutionPlan, ExecutionStep } from '../planner/agent-planner.types'

const KNOWLEDGE_TOOL_CODE = 'search_knowledge'

@Injectable()
export class AgentPlanValidator {
  // 校验计划步骤数量和每一步能力是否在上下文授权范围内。
  validate(plan: ExecutionPlan, context: AgentContext, plannerView: CapabilityType[]): ExecutionPlan {
    if (!plan.steps.length) {
      throw new BadRequestException('执行计划不能为空')
    }
    if (plan.steps.length > context.execution.maxSteps) {
      throw new BadRequestException('计划步骤超过上限')
    }

    plan.steps.forEach((step) => this.validateStep(step, context, plannerView))
    return plan
  }

  // 校验单个计划步骤不能越过 Planner 可见能力和 AgentContext 授权。
  private validateStep(step: ExecutionStep, context: AgentContext, plannerView: CapabilityType[]) {
    if (!plannerView.includes(step.capability)) {
      throw new BadRequestException(`能力未授权或不可用：${step.capability}`)
    }
    if (step.capability === 'tool') {
      this.validateToolStep(step, context)
    }
    if (step.capability === 'workflow') {
      this.validateWorkflowStep(step, context)
    }
  }

  // 校验工具步骤只能调用当前智能体授权的普通工具。
  private validateToolStep(step: ExecutionStep, context: AgentContext) {
    const toolCode = step.input.toolCode
    const allowedToolCodes = context.capabilities.toolCodes.filter((code) => code !== KNOWLEDGE_TOOL_CODE)
    if (!toolCode || !allowedToolCodes.includes(toolCode)) {
      throw new BadRequestException(`工具未授权：${toolCode}`)
    }
  }

  // 校验工作流步骤只能调用当前智能体绑定的工作流。
  private validateWorkflowStep(step: ExecutionStep, context: AgentContext) {
    const workflowCode = step.input.workflowCode
    if (!workflowCode || workflowCode !== context.capabilities.workflowCode) {
      throw new BadRequestException(`工作流未绑定：${workflowCode}`)
    }
  }
}
