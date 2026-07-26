import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { AIRegistry } from '../../../ai-engine/core/ai.registry'
import { AgentListDto, AgentStatusDto, CreateAgentDto, UpdateAgentDto } from './dto/agent.dto'

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AIRegistry,
  ) {}

  async list(query: AgentListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiAgentWhereInput = {
      ...(query.code ? { code: { contains: query.code, mode: 'insensitive' } } : {}),
      ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiAgent.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.aiAgent.count({ where }),
    ])

    return { list, total }
  }

  async detail(id: string) {
    return this.ensureAgent(id)
  }

  async enabledOptions() {
    return this.prisma.aiAgent.findMany({
      where: { status: 1 },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        mode: true,
        description: true,
        promptCode: true,
        model: true,
        knowledgeEnabled: true,
        toolCodes: true,
        workflowCode: true,
      },
    })
  }

  async configOptions() {
    const [prompts, workflows] = await Promise.all([
      this.prisma.aiPrompt.findMany({
        where: { status: 1 },
        orderBy: { updatedAt: 'desc' },
        select: {
          code: true,
          name: true,
          scene: true,
        },
      }),
      this.prisma.aiWorkflow.findMany({
        where: { status: 1 },
        orderBy: { updatedAt: 'desc' },
        select: {
          code: true,
          name: true,
          description: true,
        },
      }),
    ])

    return {
      prompts,
      workflows,
      tools: this.registry.getToolNames().map((code) => ({ code, name: code })),
    }
  }

  async create(dto: CreateAgentDto) {
    await this.ensureUniqueCode(dto.code)
    await this.ensureEnabledPrompt(dto.promptCode)
    if (dto.workflowCode) {
      await this.ensureEnabledWorkflow(dto.workflowCode)
    }
    this.ensureKnownTools(dto.toolCodes)

    await this.prisma.aiAgent.create({
      data: this.toAgentData(dto),
    })
    return '智能体新增成功'
  }

  async update(dto: UpdateAgentDto) {
    const agent = await this.ensureAgent(dto.id)
    if (dto.code && dto.code !== agent.code) {
      await this.ensureUniqueCode(dto.code, dto.id)
    }
    if (dto.promptCode) {
      await this.ensureEnabledPrompt(dto.promptCode)
    }
    if (dto.workflowCode) {
      await this.ensureEnabledWorkflow(dto.workflowCode)
    }
    this.ensureKnownTools(dto.toolCodes)

    await this.prisma.aiAgent.update({
      where: { id: dto.id },
      data: this.toAgentData(dto),
    })
    return '智能体修改成功'
  }

  async updateStatus(dto: AgentStatusDto) {
    await this.ensureAgent(dto.id)
    await this.prisma.aiAgent.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '智能体状态修改成功'
  }

  private toAgentData(dto: CreateAgentDto | UpdateAgentDto) {
    return {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      promptCode: dto.promptCode,
      mode: dto.mode,
      model: dto.model,
      temperature: dto.temperature,
      topP: dto.topP,
      knowledgeEnabled: dto.knowledgeEnabled,
      toolCodes: dto.toolCodes as Prisma.InputJsonValue,
      workflowCode: dto.workflowCode,
      status: dto.status,
      remark: dto.remark,
    }
  }

  private async ensureAgent(id: string) {
    const agent = await this.prisma.aiAgent.findUnique({ where: { id } })
    if (!agent) {
      throw new NotFoundException('智能体不存在')
    }
    return agent
  }

  private async ensureUniqueCode(code: string, excludeId?: string) {
    const existed = await this.prisma.aiAgent.findFirst({
      where: {
        code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
    if (existed) {
      throw new BadRequestException('智能体编码已存在')
    }
  }

  private async ensureEnabledPrompt(promptCode: string) {
    const prompt = await this.prisma.aiPrompt.findFirst({
      where: { code: promptCode, status: 1 },
    })
    if (!prompt) {
      throw new BadRequestException('绑定的提示词不存在或未启用')
    }
  }

  private async ensureEnabledWorkflow(workflowCode: string) {
    const workflow = await this.prisma.aiWorkflow.findFirst({
      where: { code: workflowCode, status: 1 },
    })
    if (!workflow) {
      throw new BadRequestException('绑定的工作流不存在或未启用')
    }
  }

  private ensureKnownTools(toolCodes?: string[]) {
    if (!toolCodes || !toolCodes.length) {
      return
    }

    const toolNames = new Set(this.registry.getToolNames())
    const unknownTool = toolCodes.find((code) => !toolNames.has(code))
    if (unknownTool) {
      throw new BadRequestException(`工具不存在：${unknownTool}`)
    }
  }
}
