// 执行新版智能体知识库问答能力。
import { Injectable } from '@nestjs/common'
import { KnowledgeQAService } from '../../knowledge/knowledge-qa.service'
import { CapabilityHandler } from '../../capability/capability.types'
import { AgentContext } from '../../context/agent-context.types'
import { AgentEvent } from '../../events/agent-event.types'
import { ExecutionStep } from '../../planner/agent-planner.types'

@Injectable()
export class RagHandler implements CapabilityHandler {
  capability = 'rag' as const

  // 注入知识库问答服务，复用证据整理和答案约束机制。
  constructor(private readonly knowledgeQAService: KnowledgeQAService) {}

  // 使用 AgentContext 中已解析的知识库和模型配置生成知识库回答事件。
  async *execute(context: AgentContext, step: ExecutionStep): AsyncIterable<AgentEvent> {
    const result = await this.knowledgeQAService.answer({
      question: step.input.query || context.request.message.content,
      history: context.history,
      systemPrompt: context.prompt.system,
      allowedToolCodes: context.capabilities.toolCodes,
      knowledgeStrict: context.capabilities.knowledgeStrict,
      knowledgeTags: context.capabilities.knowledgeTags,
      knowledgeBaseIds: context.capabilities.knowledgeBaseIds,
      llmOptions: context.model,
    })

    yield {
      type: 'content',
      payload: { text: result.answer },
      metadata: {
        requestId: context.metadata.requestId,
        stepId: step.id,
        capability: this.capability,
        timestamp: new Date().toISOString(),
      },
    }

    if (result.sources?.length) {
      yield {
        type: 'sources',
        payload: { sources: result.sources },
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
