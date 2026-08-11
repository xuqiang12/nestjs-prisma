// 执行已经校验通过的新版智能体能力计划。
import { BadRequestException, Injectable } from '@nestjs/common'
import { AgentContext } from '../context/agent-context.types'
import { AgentEvent } from '../events/agent-event.types'
import { ExecutionPlan } from '../planner/agent-planner.types'
import { ChatHandler } from './handlers/chat.handler'
import { RagHandler } from './handlers/rag.handler'
import { ToolHandler } from './handlers/tool.handler'
import { WorkflowHandler } from './handlers/workflow.handler'

@Injectable()
export class AgentCapabilityExecutor {
  // 注入固定能力处理器，让能力到执行器的调用关系在本文件直接可见。
  constructor(
    private readonly chatHandler: ChatHandler,
    private readonly ragHandler: RagHandler,
    private readonly toolHandler: ToolHandler,
    private readonly workflowHandler: WorkflowHandler,
  ) {}

  // 按计划顺序执行每个能力步骤，并显式分发到对应 Handler。
  async *execute(plan: ExecutionPlan, context: AgentContext): AsyncIterable<AgentEvent> {
    for (const step of plan.steps) {
      if (step.capability === 'chat') {
        yield* this.chatHandler.execute(context, step)
        continue
      }
      if (step.capability === 'rag') {
        yield* this.ragHandler.execute(context, step)
        continue
      }
      if (step.capability === 'tool') {
        yield* this.toolHandler.execute(context, step)
        continue
      }
      if (step.capability === 'workflow') {
        yield* this.workflowHandler.execute(context, step)
        continue
      }

      throw new BadRequestException(`能力处理器未注册：${step.capability}`)
    }
  }
}
