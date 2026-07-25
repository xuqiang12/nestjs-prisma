import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'

@Injectable()
export class WorkflowRunLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async startRun(params: { conversationId?: string; agentCode: string; workflowCode: string; input: Prisma.InputJsonValue }) {
    return this.prisma.aiWorkflowRun.create({
      data: {
        conversationId: params.conversationId,
        agentCode: params.agentCode,
        workflowCode: params.workflowCode,
        status: 'running',
        input: params.input,
      },
    })
  }

  async logStep(params: {
    runId: string
    nodeKey: string
    nodeType: string
    status: string
    input?: Prisma.InputJsonValue
    output?: Prisma.InputJsonValue
    errorMessage?: string
  }) {
    return this.prisma.aiWorkflowRunStep.create({
      data: {
        runId: params.runId,
        nodeKey: params.nodeKey,
        nodeType: params.nodeType,
        status: params.status,
        input: params.input,
        output: params.output,
        errorMessage: params.errorMessage,
        finishedAt: new Date(),
      },
    })
  }

  async finishRun(runId: string, output: Prisma.InputJsonValue) {
    return this.prisma.aiWorkflowRun.update({
      where: { id: runId },
      data: {
        status: 'success',
        output,
        finishedAt: new Date(),
      },
    })
  }

  async failRun(runId: string, errorMessage: string) {
    return this.prisma.aiWorkflowRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        errorMessage,
        finishedAt: new Date(),
      },
    })
  }
}
