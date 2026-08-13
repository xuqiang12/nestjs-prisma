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

  // 按计划顺序执行一个或多个工具调用并输出原有工具事件。
  async *execute(context: AgentContext, step: ExecutionStep): AsyncIterable<AgentEvent> {
    for (const toolCall of this.normalizeToolCalls(step)) {
      yield* this.executeToolCall(context, step, toolCall)
    }
  }

  // 执行单个工具调用并保持 ToolRuntimeContext 与 Tool Input 分离。
  private async *executeToolCall(
    context: AgentContext,
    step: ExecutionStep,
    toolCall: { toolCode: string; params: Record<string, any> },
  ): AsyncIterable<AgentEvent> {
    yield {
      type: 'tool_start',
      payload: { tool: { code: toolCall.toolCode, params: toolCall.params } },
      metadata: {
        requestId: context.metadata.requestId,
        stepId: step.id,
        capability: this.capability,
        timestamp: new Date().toISOString(),
      },
    }

    const result = await this.toolExecutor.execute(toolCall.toolCode, toolCall.params, {
      userId: context.user.id,
      agentCode: context.agent.code,
      conversationId: context.conversation.id,
      requestId: context.metadata.requestId,
      signal: context.model.signal,
    })
    yield {
      type: 'tool_done',
      payload: { tool: { code: toolCall.toolCode, result } },
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

  // 将新版 toolCalls 或旧版 toolCode 字段归一化为串行执行列表。
  private normalizeToolCalls(step: ExecutionStep): Array<{ toolCode: string; params: Record<string, any> }> {
    if (Array.isArray(step.input.toolCalls)) {
      return step.input.toolCalls.map((toolCall) => ({
        toolCode: String(toolCall.toolCode || ''),
        params: this.normalizeParams(toolCall.params),
      }))
    }
    return [{
      toolCode: step.input.toolCode,
      params: this.normalizeParams(step.input.params),
    }]
  }

  // 规整工具参数，避免数组或空值进入 Tool Input。
  private normalizeParams(params: any) {
    return params && typeof params === 'object' && !Array.isArray(params) ? params : {}
  }

  // 将工具结果转换为聊天区可展示的简短文本。
  private formatToolResult(result: any) {
    if (result && typeof result === 'object' && result.success === false) {
      const message = typeof result.error?.message === 'string' && result.error.message.trim()
        ? result.error.message
        : typeof result.message === 'string' && result.message.trim()
          ? result.message
          : '请稍后重试'
      return `工具调用失败：${message}`
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
