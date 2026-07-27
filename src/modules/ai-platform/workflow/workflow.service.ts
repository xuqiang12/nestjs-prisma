import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { WorkflowRuntimeService } from '../../../ai-engine/workflow/workflow-runtime.service'
import { WorkflowValidatorService } from '../../../ai-engine/workflow/workflow-validator.service'
import {
  CreateWorkflowDto,
  SaveWorkflowGraphDto,
  TestRunWorkflowDto,
  UpdateWorkflowDto,
  ValidateWorkflowGraphDto,
  WorkflowListDto,
  WorkflowStatusDto,
} from './dto/workflow.dto'

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: WorkflowValidatorService,
    private readonly workflowRuntime: WorkflowRuntimeService,
  ) {}

  async list(query: WorkflowListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiWorkflowWhereInput = {
      ...(query.code ? { code: { contains: query.code, mode: 'insensitive' } } : {}),
      ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiWorkflow.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { nodes: true, edges: true } },
        },
      }),
      this.prisma.aiWorkflow.count({ where }),
    ])
    return {
      list: list.map((item) => ({
        ...item,
        nodeCount: item._count.nodes,
        edgeCount: item._count.edges,
      })),
      total,
    }
  }

  async detail(id: string) {
    const workflow = await this.prisma.aiWorkflow.findUnique({
      where: { id },
      include: {
        nodes: { orderBy: { sortNo: 'asc' } },
        edges: { orderBy: { sortNo: 'asc' } },
      },
    })
    if (!workflow) {
      throw new NotFoundException('工作流不存在')
    }
    return workflow
  }

  async create(dto: CreateWorkflowDto) {
    await this.ensureUniqueCode(dto.code)
    await this.prisma.aiWorkflow.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status ?? 1,
        version: dto.version || 1,
        remark: dto.remark,
      },
    })
    return '工作流新增成功'
  }

  async update(dto: UpdateWorkflowDto) {
    const workflow = await this.ensureWorkflow(dto.id)
    if (dto.code && dto.code !== workflow.code) {
      await this.ensureUniqueCode(dto.code, dto.id)
    }
    await this.prisma.aiWorkflow.update({
      where: { id: dto.id },
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        version: dto.version,
        remark: dto.remark,
      },
    })
    return '工作流修改成功'
  }

  async updateStatus(dto: WorkflowStatusDto) {
    const workflow = await this.ensureWorkflow(dto.id)
    if (dto.status === 0) {
      const agent = await this.prisma.aiAgent.findFirst({
        where: { workflowCode: workflow.code, status: 1 },
      })
      if (agent) {
        throw new BadRequestException('已有启用智能体绑定该工作流，不能停用')
      }
    }
    await this.prisma.aiWorkflow.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '工作流状态修改成功'
  }

  async saveGraph(dto: SaveWorkflowGraphDto) {
    const workflow = await this.ensureWorkflow(dto.workflowId)
    this.validator.validateGraph({ nodes: dto.nodes, edges: dto.edges })

    await this.prisma.$transaction([
      this.prisma.aiWorkflowEdge.deleteMany({ where: { workflowId: workflow.id } }),
      this.prisma.aiWorkflowNode.deleteMany({ where: { workflowId: workflow.id } }),
      this.prisma.aiWorkflowNode.createMany({
        data: dto.nodes.map((node, index) => ({
          workflowId: workflow.id,
          nodeKey: node.nodeKey,
          type: node.type,
          name: node.name,
          config: node.config as Prisma.InputJsonValue,
          sortNo: node.sortNo ?? index + 1,
        })),
      }),
      this.prisma.aiWorkflowEdge.createMany({
        data: dto.edges.map((edge, index) => ({
          workflowId: workflow.id,
          fromNodeKey: edge.fromNodeKey,
          toNodeKey: edge.toNodeKey,
          condition: edge.condition as Prisma.InputJsonValue,
          sortNo: edge.sortNo ?? index + 1,
        })),
      }),
    ])
    return '工作流图保存成功'
  }

  validate(dto: ValidateWorkflowGraphDto) {
    this.validator.validateGraph({ nodes: dto.nodes, edges: dto.edges })
    return { success: true }
  }

  async testRun(dto: TestRunWorkflowDto, userId: number) {
    return this.workflowRuntime.execute(dto.workflowCode, {
      message: dto.message,
      userId,
      agentCode: 'test-run',
      workflowCode: dto.workflowCode,
      allowedToolCodes: dto.toolCodes || [],
    })
  }

  private async ensureWorkflow(id: string) {
    const workflow = await this.prisma.aiWorkflow.findUnique({ where: { id } })
    if (!workflow) {
      throw new NotFoundException('工作流不存在')
    }
    return workflow
  }

  private async ensureUniqueCode(code: string, excludeId?: string) {
    const existed = await this.prisma.aiWorkflow.findFirst({
      where: {
        code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
    if (existed) {
      throw new BadRequestException('工作流编码已存在')
    }
  }
}
