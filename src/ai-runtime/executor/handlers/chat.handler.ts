// 执行新版智能体普通对话能力。
import { Injectable } from '@nestjs/common'
import { LlmService } from '../../llm/llm.service'
import { CapabilityHandler } from '../../capability/capability.types'
import { AgentContext } from '../../context/agent-context.types'
import { AgentEvent } from '../../events/agent-event.types'
import { ExecutionStep } from '../../planner/agent-planner.types'

@Injectable()
export class ChatHandler implements CapabilityHandler {
  capability = 'chat' as const

  // 注入底层 LLM 服务，模型配置必须来自 AgentContext。
  constructor(private readonly llmService: LlmService) {}

  // 根据上下文提示词、历史和当前用户问题流式输出普通对话内容。
  async *execute(context: AgentContext, step: ExecutionStep): AsyncIterable<AgentEvent> {
    const messages = [
      { role: 'system' as const, content: context.prompt.system },
      ...context.history,
      { role: 'user' as const, content: step.input.message || context.request.message.content },
    ]

    for await (const text of this.llmService.streamWithMessages(messages, {
      ...context.model,
      temperature: context.execution.temperature,
      topP: context.execution.topP,
      finalAnswerGuard: true,
      roleTemplateStops: true,
    })) {
      yield {
        type: 'content',
        payload: { text },
        metadata: {
          requestId: context.metadata.requestId,
          stepId: step.id,
          capability: this.capability,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }
}
