// 记录新版智能体运行时的轻量执行计划日志。
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { AgentContext } from '../context/agent-context.types'
import { ExecutionPlan } from '../planner/agent-planner.types'

export type AgentTraceRecord = {
  id: string
}

@Injectable()
export class AgentTraceService {
  // 注入 Prisma 以复用现有智能体执行日志表。
  constructor(private readonly prisma: PrismaService) {}

  // 创建一次新版智能体运行的执行日志。
  async start(context: AgentContext, plan: ExecutionPlan): Promise<AgentTraceRecord> {
    return this.prisma.aiAgentExecutionLog.create({
      data: {
        conversationId: context.conversation.id,
        agentCode: context.agent.code,
        planJson: plan as any,
        status: 'running',
      },
      select: { id: true },
    })
  }

  // 标记一次新版智能体运行日志为成功。
  async finish(traceId?: string) {
    if (!traceId) {
      return
    }
    await this.prisma.aiAgentExecutionLog.update({
      where: { id: traceId },
      data: {
        status: 'success',
        finishedAt: new Date(),
      },
    })
  }

  // 标记一次新版智能体运行日志为失败。
  async fail(traceId: string | undefined, error: unknown) {
    if (!traceId) {
      return
    }
    await this.prisma.aiAgentExecutionLog.update({
      where: { id: traceId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '新版智能体运行失败',
        finishedAt: new Date(),
      },
    })
  }
}
