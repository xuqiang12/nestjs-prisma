// 汇总新版智能体执行事件并生成协议无关事件。
import { Injectable } from '@nestjs/common'
import { CapabilityType } from '../capability/capability.types'
import { AgentContext } from '../context/agent-context.types'
import { AgentEvent } from '../events/agent-event.types'
import { ExecutionPlan } from '../planner/agent-planner.types'

export type AssistantResult = {
  answer: string
  sources: any[]
  promptId?: string
  workflowCode?: string
}

@Injectable()
export class AgentComposer {
  // 为执行计划生成可观察的计划事件。
  createPlanEvent(plan: ExecutionPlan, plannerView: CapabilityType[], context: AgentContext): AgentEvent {
    return {
      type: 'plan',
      payload: { plan, plannerView },
      metadata: this.createMetadata(context),
    }
  }

  // 为异常生成统一错误事件。
  createErrorEvent(error: unknown, context?: Pick<AgentContext, 'metadata'>): AgentEvent {
    return {
      type: 'error',
      payload: {
        code: 'AGENT_CHAT_V2_ERROR',
        message: error instanceof Error ? error.message : '新版智能体运行失败',
      },
      metadata: this.createMetadata(context),
    }
  }

  // 为一次请求生成结束事件。
  createDoneEvent(context?: Pick<AgentContext, 'metadata'>): AgentEvent {
    return {
      type: 'done',
      payload: {},
      metadata: this.createMetadata(context),
    }
  }

  // 从执行事件中汇总最终 assistant 文本和知识来源。
  collectAssistantResult(events: AgentEvent[]): AssistantResult {
    return events.reduce<AssistantResult>((result, event) => {
      if (!result.promptId && event.metadata.promptId) {
        result.promptId = event.metadata.promptId
      }
      if (!result.workflowCode && event.metadata.workflowCode) {
        result.workflowCode = event.metadata.workflowCode
      }
      if (event.type === 'content') {
        result.answer += event.payload.text
      }
      if (event.type === 'sources') {
        result.sources = event.payload.sources
      }
      return result
    }, { answer: '', sources: [] })
  }

  // 基于上下文创建统一事件元数据。
  private createMetadata(context?: Partial<AgentContext>) {
    return {
      requestId: context?.metadata.requestId,
      agentCode: context?.agent?.code,
      promptId: context?.prompt?.id,
      workflowCode: context?.capabilities?.workflowCode,
      timestamp: new Date().toISOString(),
    }
  }
}
