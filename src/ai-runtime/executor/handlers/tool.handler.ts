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
    yield {
      type: 'content',
      payload: { text: this.formatToolResult(result) },
      metadata: {
        requestId: context.metadata.requestId,
        stepId: step.id,
        capability: this.capability,
        timestamp: new Date().toISOString(),
      },
    }
  }

  // 将工具结果转换为聊天区可展示的简短文本。
  private formatToolResult(result: any) {
    if (result && typeof result === 'object' && result.success === false) {
      return `工具调用失败：${typeof result.message === 'string' && result.message.trim() ? result.message : '请稍后重试'}`
    }
    if (typeof result === 'string') {
      return result
    }
    return `工具调用完成：${this.stringifyResult(result)}`
  }

  // 安全序列化工具结果，避免复杂对象导致响应中断。
  private stringifyResult(result: any) {
    try {
      return JSON.stringify(result)
    } catch {
      return String(result)
    }
  }
}
