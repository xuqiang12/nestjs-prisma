// 编排新版智能体运行时从上下文构建到能力执行的主流程。
import { Injectable } from '@nestjs/common'
import { CapabilityResolver } from './capability/capability-resolver.service'
import { AgentComposer } from './composer/agent-composer.service'
import { AgentContextBuilder } from './context/agent-context.builder'
import { AgentCapabilityExecutor } from './executor/agent-capability-executor.service'
import { AgentEvent } from './events/agent-event.types'
import { AgentRuntimeRequest } from './agent-runtime.types'
import { RulePlanner } from './planner/rule-planner.service'
import { AgentPlanValidator } from './validator/agent-plan-validator.service'
import { AgentTraceService } from './trace/agent-trace.service'

@Injectable()
export class AgentRuntimeService {
  // 注入新版运行时各阶段依赖，保持主流程只做编排。
  constructor(
    private readonly contextBuilder: AgentContextBuilder,
    private readonly capabilityResolver: CapabilityResolver,
    private readonly planner: RulePlanner,
    private readonly validator: AgentPlanValidator,
    private readonly executor: AgentCapabilityExecutor,
    private readonly composer: AgentComposer,
    private readonly trace: AgentTraceService,
  ) {}

  // 从统一请求开始执行新版智能体运行时并产出协议无关事件。
  async *stream(request: AgentRuntimeRequest): AsyncIterable<AgentEvent> {
    const context = await this.contextBuilder.build(request)
    const capabilities = this.capabilityResolver.resolve(context)
    const plan = await this.planner.plan(context, capabilities.plannerView)
    const validatedPlan = this.validator.validate(plan, context, capabilities.plannerView)
    yield this.composer.createPlanEvent(validatedPlan, capabilities.plannerView, context)

    const traceRecord = await this.trace.start(context, validatedPlan)
    try {
      for await (const event of this.executor.execute(validatedPlan, context)) {
        yield event
      }
      await this.trace.finish(traceRecord.id)
    } catch (error) {
      await this.trace.fail(traceRecord.id, error)
      throw error
    }
  }
}
