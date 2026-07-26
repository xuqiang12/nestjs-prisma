import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { WorkflowExecutionInput } from './workflow.types'
import { WorkflowExecutorService } from './workflow-executor.service'
import { WorkflowValidatorService } from './workflow-validator.service'

@Injectable()
export class WorkflowRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: WorkflowValidatorService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  async execute(workflowCode: string, input: WorkflowExecutionInput) {
    const graph = await this.loadEnabledGraph(workflowCode)
    return this.executor.execute(graph, { ...input, workflowCode })
  }

  async stream(workflowCode: string, input: WorkflowExecutionInput) {
    const graph = await this.loadEnabledGraph(workflowCode)
    return this.executor.streamExecute(graph, { ...input, workflowCode })
  }

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
