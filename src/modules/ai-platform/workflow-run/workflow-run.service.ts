import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { WorkflowRunListDto } from './dto/workflow-run.dto'

@Injectable()
export class WorkflowRunService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: WorkflowRunListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiWorkflowRunWhereInput = {
      ...(query.agentCode ? { agentCode: query.agentCode } : {}),
      ...(query.workflowCode ? { workflowCode: query.workflowCode } : {}),
      ...(query.status ? { status: query.status } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiWorkflowRun.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiWorkflowRun.count({ where }),
    ])
    return { list, total }
  }

  async detail(id: string) {
    const run = await this.prisma.aiWorkflowRun.findUnique({
      where: { id },
      include: { steps: { orderBy: { createdAt: 'asc' } } },
    })
    if (!run) {
      throw new NotFoundException('工作流运行记录不存在')
    }
    return run
  }
}
