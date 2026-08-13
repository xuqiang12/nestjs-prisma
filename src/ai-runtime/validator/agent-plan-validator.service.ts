// 校验新版智能体执行计划是否只使用已授权能力。
import { BadRequestException, Injectable } from '@nestjs/common'
import { CapabilityType } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { ExecutionPlan, ExecutionStep } from '../planner/agent-planner.types'
import { RuntimeToolRegistry } from '../tools/runtime-tool-registry.service'

const KNOWLEDGE_TOOL_CODE = 'search_knowledge'

@Injectable()
export class AgentPlanValidator {
  // 注入运行时工具目录，作为工具计划最终授权和状态校验边界。
  constructor(private readonly toolRegistry: RuntimeToolRegistry) {}

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

  // 校验工具步骤中的每个 ToolCall 都只能调用当前智能体授权的普通工具。
  private validateToolStep(step: ExecutionStep, context: AgentContext) {
    const toolCalls = this.normalizeToolCalls(step)
    if (!toolCalls.length) {
      throw new BadRequestException('工具未授权：undefined')
    }
    toolCalls.forEach((toolCall) => this.validateToolCall(toolCall.toolCode, context))
  }

  // 校验单个工具调用是否通过 Agent 授权和运行时工具状态边界。
  private validateToolCall(toolCode: string, context: AgentContext) {
    const allowedToolCodes = context.capabilities.toolCodes.filter((code) => code !== KNOWLEDGE_TOOL_CODE)
    if (!toolCode || !allowedToolCodes.includes(toolCode)) {
      throw new BadRequestException(`工具未授权：${toolCode}`)
    }
    const tool = this.toolRegistry.getTool(toolCode)
    if (!tool || !tool.enabled || tool.exposure !== 'agent') {
      throw new BadRequestException(`工具不可用：${toolCode}`)
    }
  }

  // 将新版 toolCalls 或旧版 toolCode 字段归一化为统一校验列表。
  private normalizeToolCalls(step: ExecutionStep): Array<{ toolCode: string }> {
    if (Array.isArray(step.input.toolCalls)) {
      return step.input.toolCalls
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({ toolCode: String(item.toolCode || '') }))
    }
    return [{ toolCode: step.input.toolCode }]
  }

  // 校验工作流步骤只能调用当前智能体绑定的工作流。
  private validateWorkflowStep(step: ExecutionStep, context: AgentContext) {
    const workflowCode = step.input.workflowCode
    if (!workflowCode || workflowCode !== context.capabilities.workflowCode) {
      throw new BadRequestException(`工作流未绑定：${workflowCode}`)
    }
  }
}
