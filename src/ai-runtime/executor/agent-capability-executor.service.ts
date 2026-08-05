// 执行已经校验通过的新版智能体能力计划。
import { Injectable } from '@nestjs/common'
import { CapabilityRegistry } from '../capability/capability-registry.service'
import { AgentContext } from '../context/agent-context.types'
import { AgentEvent } from '../events/agent-event.types'
import { ExecutionPlan } from '../planner/agent-planner.types'

@Injectable()
export class AgentCapabilityExecutor {
  // 注入能力注册表，保持 Executor 只负责调度。
  constructor(private readonly registry: CapabilityRegistry) {}

  // 按计划顺序执行每个能力步骤并透传内部事件。
  async *execute(plan: ExecutionPlan, context: AgentContext): AsyncIterable<AgentEvent> {
    for (const step of plan.steps) {
      const handler = this.registry.get(step.capability)
      for await (const event of handler.execute(context, step)) {
        yield event
      }
    }
  }
}
