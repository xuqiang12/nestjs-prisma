import { BadRequestException, Injectable } from '@nestjs/common'
import { AgentContext, AgentPlan, AgentPlanStep, AgentRuntimeInput } from './agent-runtime.types'

export const MAX_AGENT_PLAN_STEPS = 3

const AGENT_PLAN_STEP_TYPES = ['chat', 'knowledge', 'tool', 'workflow']

@Injectable()
export class AgentPlanService {
  createPlan(input: AgentRuntimeInput, context: AgentContext): AgentPlan {
    const step = this.createStep(input, context)
    return {
      goal: input.message,
      steps: [step].slice(0, MAX_AGENT_PLAN_STEPS),
    }
  }

  validate(plan: AgentPlan, context: AgentContext) {
    if (!plan.steps.length) {
      throw new BadRequestException('Agent plan cannot be empty')
    }
    if (plan.steps.length > context.maxSteps) {
      throw new BadRequestException(`Agent plan allows at most ${context.maxSteps} steps`)
    }
    plan.steps.forEach((step) => this.validateStep(step, context))
  }

  private createStep(input: AgentRuntimeInput, context: AgentContext): AgentPlanStep {
    const workflowCode = context.workflow?.code
    if (workflowCode) {
      return {
        type: 'workflow',
        action: 'execute',
        target: workflowCode,
        params: { message: input.message },
      }
    }

    if (input.requestedToolCode) {
      return {
        type: 'tool',
        action: 'execute',
        target: input.requestedToolCode,
        params: { message: input.message },
      }
    }

    if (context.knowledge.enabled && context.mode === 'knowledge') {
      return {
        type: 'knowledge',
        action: 'search',
        target: 'knowledge',
        params: { keyword: input.message },
      }
    }

    return {
      type: 'chat',
      action: 'reply',
      target: 'llm',
      params: { message: input.message },
    }
  }

  private validateStep(step: AgentPlanStep, context: AgentContext) {
    if (!AGENT_PLAN_STEP_TYPES.includes(step.type)) {
      throw new BadRequestException(`Unsupported Agent step type: ${step.type}`)
    }
    if (step.type === 'knowledge' && !context.knowledge.enabled) {
      throw new BadRequestException('Agent knowledge ability is not enabled')
    }
    if (step.type === 'knowledge' && !context.tools.includes('search_knowledge')) {
      throw new BadRequestException('Agent is not allowed to use knowledge search')
    }
    if (step.type === 'tool' && (!step.target || !context.tools.includes(step.target))) {
      throw new BadRequestException('Tool execution is not allowed')
    }
    if (step.type === 'workflow' && step.target !== context.workflow?.code) {
      throw new BadRequestException('Agent is not bound to this workflow')
    }
  }
}
