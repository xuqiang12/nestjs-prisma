import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import {
  ExecutionLogger,
  ExecutionLogFailedInput,
  ExecutionLogStartInput,
  ExecutionLogSuccessInput,
} from './agent-runtime.types'

@Injectable()
export class AgentExecutionLoggerService implements ExecutionLogger {
  constructor(private readonly prisma: PrismaService) {}

  async logStart(input: ExecutionLogStartInput) {
    return this.prisma.aiAgentExecutionLog.create({
      data: {
        conversationId: input.conversationId,
        messageId: input.messageId,
        agentCode: input.agentCode,
        planJson: input.plan as unknown as Prisma.InputJsonValue,
        status: 'running',
        startedAt: new Date(),
      },
    })
  }

  async logSuccess(id: string, result: ExecutionLogSuccessInput) {
    await this.prisma.aiAgentExecutionLog.update({
      where: { id },
      data: {
        route: result.route,
        durationMs: result.durationMs,
        status: 'success',
        finishedAt: new Date(),
      },
    })
  }

  async logFailed(id: string, error: ExecutionLogFailedInput) {
    await this.prisma.aiAgentExecutionLog.update({
      where: { id },
      data: {
        durationMs: error.durationMs,
        status: 'failed',
        errorMessage: error.message,
        finishedAt: new Date(),
      },
    })
  }
}
