// 执行新版智能体已绑定工作流能力。
import { Injectable } from '@nestjs/common'
import { WorkflowRuntimeService } from '../../workflow/workflow-runtime.service'
import { CapabilityHandler } from '../../capability/capability.types'
import { AgentContext } from '../../context/agent-context.types'
import { AgentEvent } from '../../events/agent-event.types'
import { ExecutionStep } from '../../planner/agent-planner.types'

@Injectable()
export class WorkflowHandler implements CapabilityHandler {
  capability = 'workflow' as const

  // 注入底层工作流运行时，工作流绑定由 Validator 先行校验。
  constructor(private readonly workflowRuntimeService: WorkflowRuntimeService) {}

  // 执行绑定工作流并把底层流式事件映射为 AgentEvent。
  async *execute(context: AgentContext, step: ExecutionStep): AsyncIterable<AgentEvent> {
    const workflowCode = step.input.workflowCode || context.capabilities.workflowCode
    const events = await this.workflowRuntimeService.stream(workflowCode, {
      message: step.input.message || context.request.message.content,
      originalQuestion: step.input.originalQuestion || context.request.message.content,
      rewrittenQuestion: step.input.rewrittenQuestion || step.input.message || context.request.message.content,
      rewriteApplied: !!step.input.rewriteApplied,
      userId: context.user.id,
      history: context.history,
      agentCode: context.agent.code,
      workflowCode,
      conversationId: context.conversation.id,
      allowedToolCodes: context.capabilities.toolCodes,
      knowledgeStrict: context.capabilities.knowledgeStrict,
      knowledgeTags: context.capabilities.knowledgeTags,
      knowledgeBaseIds: context.capabilities.knowledgeBaseIds,
      llmOptions: context.model,
    })

    for await (const event of events) {
      yield this.toAgentEvent(event, context, step)
    }
  }

  // 将底层工作流事件归一化为新版智能体事件包络。
  private toAgentEvent(event: any, context: AgentContext, step: ExecutionStep): AgentEvent {
    const metadata = {
      requestId: context.metadata.requestId,
      stepId: step.id,
      capability: this.capability,
      timestamp: new Date().toISOString(),
    }
    if (event.type === 'content') {
      return { type: 'content', payload: { text: event.content }, metadata }
    }
    if (event.type === 'sources') {
      return { type: 'sources', payload: { sources: event.sources || [] }, metadata }
    }
    return { type: event.type, payload: { ...event }, metadata }
  }
}
