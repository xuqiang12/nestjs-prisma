// 执行新版智能体普通工具能力。
import { Injectable } from '@nestjs/common'
import { DefaultToolExecutor } from '../../tools/default-tool.executor'
import { CapabilityHandler } from '../../capability/capability.types'
import { AgentContext } from '../../context/agent-context.types'
import { AgentEvent } from '../../events/agent-event.types'
import { ExecutionStep } from '../../planner/agent-planner.types'

@Injectable()
export class ToolHandler implements CapabilityHandler {
  capability = 'tool' as const

  // 注入底层工具执行器，工具授权由 Validator 先行校验。
  constructor(private readonly toolExecutor: DefaultToolExecutor) {}

  // 执行计划指定的工具并输出工具开始和完成事件。
  async *execute(context: AgentContext, step: ExecutionStep): AsyncIterable<AgentEvent> {
    const toolCode = step.input.toolCode
    const params = step.input.params || {}
    yield {
      type: 'tool_start',
      payload: { tool: { code: toolCode, params } },
      metadata: {
        requestId: context.metadata.requestId,
        stepId: step.id,
        capability: this.capability,
        timestamp: new Date().toISOString(),
      },
    }

    const result = await this.toolExecutor.execute(toolCode, params)
    yield {
      type: 'tool_done',
      payload: { tool: { code: toolCode, result } },
      metadata: {
        requestId: context.metadata.requestId,
        stepId: step.id,
        capability: this.capability,
        timestamp: new Date().toISOString(),
      },
    }
  }
}
