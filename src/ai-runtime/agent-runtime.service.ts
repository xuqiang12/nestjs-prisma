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
import { ExecutionPlan, ExecutionStep, ToolExecutionRecord } from './planner/agent-planner.types'

export const DEFAULT_MAX_ITERATIONS = 5

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
    if (request.signal?.aborted) {
      return
    }
    const capabilities = this.capabilityResolver.resolve(context)
    const toolResults: ToolExecutionRecord[] = []

    for (let iteration = 0; iteration < DEFAULT_MAX_ITERATIONS; iteration++) {
      const plan = await this.planner.plan(context, capabilities.plannerView, capabilities.plannerToolCatalog, toolResults)
      if (request.signal?.aborted) {
        return
      }
      const validatedPlan = this.validator.validate(plan, context, capabilities.plannerView)
      yield this.composer.createPlanEvent(validatedPlan, capabilities.plannerView, context)

      const traceRecord = await this.trace.start(context, validatedPlan)
      try {
        if (request.signal?.aborted) {
          await this.trace.finish(traceRecord.id)
          return
        }
        for await (const event of this.executor.execute(validatedPlan, context)) {
          const toolRecord = this.collectToolResult(event, validatedPlan)
          if (toolRecord) {
            toolResults.push(toolRecord)
          }
          if (this.shouldYieldEvent(event, validatedPlan)) {
            yield event
          }
        }
        await this.trace.finish(traceRecord.id)
      } catch (error) {
        await this.trace.fail(traceRecord.id, error)
        throw error
      }

      if (!this.shouldContinueLoop(validatedPlan)) {
        return
      }
    }

    throw new Error('Agent Loop 达到最大轮数')
  }

  // 判断当前计划是否还需要把工具结果交回 Planner 继续下一轮。
  private shouldContinueLoop(plan: ExecutionPlan) {
    return plan.steps.some((step) => step.capability === 'tool')
  }

  // 收集工具完成事件中的 ToolCall 和 ToolResult，作为下一轮 Planner 的结构化输入。
  private collectToolResult(event: AgentEvent, plan: ExecutionPlan): ToolExecutionRecord | null {
    if (event.type !== 'tool_done') {
      return null
    }
    const toolCode = event.payload.tool.code
    const toolCall = this.findToolCall(plan, toolCode)
    return {
      toolCall,
      result: event.payload.tool.result,
    }
  }

  // 从已校验计划中找到工具调用参数，保证 Planner 下一轮能看到执行输入。
  private findToolCall(plan: ExecutionPlan, toolCode: string) {
    for (const step of plan.steps) {
      if (step.capability !== 'tool') {
        continue
      }
      for (const toolCall of this.normalizeToolCalls(step)) {
        if (toolCall.toolCode === toolCode) {
          return toolCall
        }
      }
    }
    return { toolCode, params: {} }
  }

  // 将执行步骤中的新版 toolCalls 和旧版 toolCode 字段归一化。
  private normalizeToolCalls(step: ExecutionStep) {
    if (Array.isArray(step.input.toolCalls)) {
      return step.input.toolCalls.map((toolCall) => ({
        toolCode: String(toolCall.toolCode || ''),
        params: this.normalizeParams(toolCall.params),
      }))
    }
    return [{
      toolCode: String(step.input.toolCode || ''),
      params: this.normalizeParams(step.input.params),
    }]
  }

  // 规整工具参数，避免 Loop 状态混入 ToolCall 参数。
  private normalizeParams(params: any) {
    return params && typeof params === 'object' && !Array.isArray(params) ? params : {}
  }

  // 隔离工具轮次的展示文本，避免中间 Tool content 被持久化为最终回答。
  private shouldYieldEvent(event: AgentEvent, plan: ExecutionPlan) {
    if (this.shouldContinueLoop(plan) && event.type === 'content') {
      return false
    }
    return true
  }
}
