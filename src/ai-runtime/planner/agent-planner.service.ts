// 协调新版智能体计划生成入口。
import { Injectable } from '@nestjs/common'
import { CapabilityType } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { ExecutionPlan } from './agent-planner.types'
import { RulePlanner } from './rule-planner.service'

@Injectable()
export class AgentPlanner {
  // 注入第一版 AI 意图计划器，后续可替换为更复杂的计划来源。
  constructor(private readonly rulePlanner: RulePlanner) {}

  // 只基于 Planner 可见能力生成执行计划。
  async plan(context: AgentContext, plannerView: CapabilityType[]): Promise<ExecutionPlan> {
    return this.rulePlanner.plan(context, plannerView)
  }
}
