// 记录 AI 工作流运行和节点执行日志。
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'

@Injectable()
export class WorkflowRunLoggerService {
  // 注入 Prisma 以写入工作流运行日志。
  constructor(private readonly prisma: PrismaService) {}

  // 创建工作流运行主记录。
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

  // 写入单个工作流节点的执行结果。
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

  // 将工作流运行标记为成功并保存最终输出。
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

  // 将工作流运行标记为失败并保存错误信息。
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
