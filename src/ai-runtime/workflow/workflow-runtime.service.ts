// 加载、校验并调度 AI 工作流运行图。
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { WorkflowExecutionInput } from './workflow.types'
import { WorkflowExecutorService } from './workflow-executor.service'
import { WorkflowValidatorService } from './workflow-validator.service'

@Injectable()
export class WorkflowRuntimeService {
  // 注入 Prisma、工作流图校验器和节点执行器。
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: WorkflowValidatorService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  // 加载启用工作流并以非流式方式执行。
  async execute(workflowCode: string, input: WorkflowExecutionInput) {
    const graph = await this.loadEnabledGraph(workflowCode)
    return this.executor.execute(graph, { ...input, workflowCode })
  }

  // 加载启用工作流并以流式事件方式执行。
  async stream(workflowCode: string, input: WorkflowExecutionInput) {
    const graph = await this.loadEnabledGraph(workflowCode)
    return this.executor.streamExecute(graph, { ...input, workflowCode })
  }

  // 从数据库读取启用工作流图并完成结构校验。
  private async loadEnabledGraph(workflowCode: string) {
    const workflow = await this.prisma.aiWorkflow.findFirst({
      where: { code: workflowCode, status: 1 },
      include: {
        nodes: { orderBy: { sortNo: 'asc' } },
        edges: { orderBy: { sortNo: 'asc' } },
      },
    })
    if (!workflow) {
      throw new BadRequestException('工作流不存在或未启用')
    }

    const graph = {
      nodes: workflow.nodes.map((node) => ({
        nodeKey: node.nodeKey,
        type: node.type,
        name: node.name,
        config: node.config as Record<string, any>,
        sortNo: node.sortNo,
      })),
      edges: workflow.edges.map((edge) => ({
        fromNodeKey: edge.fromNodeKey,
        toNodeKey: edge.toNodeKey,
        condition: edge.condition as Record<string, any> | undefined,
        sortNo: edge.sortNo,
      })),
    }
    this.validator.validateGraph(graph)
    return graph
  }
}
