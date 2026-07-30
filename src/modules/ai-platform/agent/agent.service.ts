import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { AIRegistry } from '../../../ai-engine/core/ai.registry'
import { AgentListDto, AgentStatusDto, CreateAgentDto, UpdateAgentDto } from './dto/agent.dto'

const MODEL_OPTIONS = [
  {
    label: 'Qwen2.5 7B 指令模型',
    value: 'Qwen/Qwen2.5-7B-Instruct',
    key: 'Qwen/Qwen2.5-7B-Instruct',
    provider: 'SiliconFlow',
  },
]

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
        avatar: true,
        welcomeMessage: true,
        recommendedQuestions: true,
        tags: true,
        promptId: true,
        promptSyncEnabled: true,
        promptSnapshot: true,
        promptEnhancement: true,
        model: true,
        knowledgeEnabled: true,
        knowledgeStrict: true,
        knowledgeTags: true,
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
          id: true,
          code: true,
          name: true,
          scene: true,
          content: true,
        },
      }),
      this.prisma.aiWorkflow.findMany({
        where: { status: 1 },
        orderBy: { updatedAt: 'desc' },
        select: {
          code: true,
          name: true,
          description: true,
          nodes: {
            select: {
              type: true,
              config: true,
            },
          },
        },
      }),
    ])

    return {
      prompts,
      workflows: workflows.map((workflow) => ({
        code: workflow.code,
        name: workflow.name,
        description: workflow.description,
        requiredToolCodes: this.collectWorkflowRequiredToolCodes(workflow.nodes),
        promptIds: this.collectWorkflowPromptIds(workflow.nodes),
      })),
      tools: this.registry.listTools().map((tool) => ({
        code: tool.name,
        name: tool.description || tool.name,
      })),
      models: MODEL_OPTIONS,
    }
  }

  async create(dto: CreateAgentDto) {
    await this.ensureEnabledPrompt(dto.promptId)
    if (dto.workflowCode) {
      await this.ensureEnabledWorkflow(dto.workflowCode)
    }
    this.ensureKnownTools(dto.toolCodes)
    await this.ensureWorkflowRequiredTools(dto.workflowCode, dto.toolCodes)

    const data = await this.toAgentData(dto)
    await this.prisma.aiAgent.create({
      data: {
        ...data,
        code: await this.nextAgentCode(),
      } as Prisma.AiAgentUncheckedCreateInput,
    })
    return '智能体新增成功'
  }

  async update(dto: UpdateAgentDto) {
    const agent = await this.ensureAgent(dto.id)
    if (dto.promptId) {
      await this.ensureEnabledPrompt(dto.promptId)
    }
    if (dto.workflowCode) {
      await this.ensureEnabledWorkflow(dto.workflowCode)
    }
    this.ensureKnownTools(dto.toolCodes)
    await this.ensureWorkflowRequiredTools(dto.workflowCode, dto.toolCodes)

    const data = await this.toAgentData(dto, agent.promptId)
    await this.prisma.aiAgent.update({
      where: { id: dto.id },
      data: data as Prisma.AiAgentUncheckedUpdateInput,
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

  private async toAgentData(dto: CreateAgentDto | UpdateAgentDto, fallbackPromptId?: string) {
    const promptId = dto.promptId || fallbackPromptId
    const data: Record<string, any> = {
      name: dto.name,
      description: dto.description,
      avatar: dto.avatar,
      welcomeMessage: dto.welcomeMessage,
      recommendedQuestions: dto.recommendedQuestions as Prisma.InputJsonValue,
      tags: dto.tags as Prisma.InputJsonValue,
      promptId: dto.promptId,
      promptSyncEnabled: dto.promptSyncEnabled,
      promptEnhancement: dto.promptEnhancement,
      mode: dto.mode,
      model: dto.model,
      temperature: dto.temperature,
      topP: dto.topP,
      knowledgeEnabled: dto.knowledgeEnabled,
      knowledgeStrict: dto.knowledgeStrict,
      knowledgeTags: dto.knowledgeTags as Prisma.InputJsonValue,
      toolCodes: dto.toolCodes as Prisma.InputJsonValue,
      workflowCode: dto.workflowCode,
      status: dto.status,
      remark: dto.remark,
    }
    if (!('id' in dto) || dto.promptId !== undefined || dto.promptSnapshot !== undefined) {
      data.promptSnapshot = await this.resolvePromptSnapshot(promptId, dto.promptSnapshot)
    }
    return data
  }

  private async resolvePromptSnapshot(promptId?: string, snapshot?: string) {
    const value = snapshot?.trim()
    if (value) {
      return value
    }
    if (!promptId) {
      return ''
    }
    const prompt = await this.prisma.aiPrompt.findFirst({
      where: { id: promptId, status: 1 },
      select: { content: true },
    })
    return prompt?.content || ''
  }

  private async nextAgentCode() {
    const lastAgent = await this.prisma.aiAgent.findFirst({
      where: { code: { startsWith: 'ZNT' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    })
    const lastNumber = lastAgent?.code && /^ZNT\d{16}$/.test(lastAgent.code)
      ? BigInt(lastAgent.code.slice(3))
      : 0n
    return `ZNT${String(lastNumber + 1n).padStart(16, '0')}`
  }

  private async ensureAgent(id: string) {
    const agent = await this.prisma.aiAgent.findUnique({ where: { id } })
    if (!agent) {
      throw new NotFoundException('智能体不存在')
    }
    return agent
  }

  private async ensureEnabledPrompt(promptId: string) {
    const prompt = await this.prisma.aiPrompt.findFirst({
      where: { id: promptId, status: 1 },
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

  private async ensureWorkflowRequiredTools(workflowCode: string | undefined, toolCodes?: string[]) {
    if (!workflowCode) {
      return
    }

    const workflow = await this.prisma.aiWorkflow.findFirst({
      where: { code: workflowCode, status: 1 },
      select: {
        nodes: {
          select: {
            type: true,
            config: true,
          },
        },
      },
    })
    if (!workflow) {
      return
    }

    const requiredToolCodes = this.collectWorkflowRequiredToolCodes(workflow.nodes)
    if (!requiredToolCodes.length) {
      return
    }

    const selectedToolCodes = new Set(toolCodes || [])
    const missingTools = requiredToolCodes.filter((code) => !selectedToolCodes.has(code))
    if (missingTools.length) {
      throw new BadRequestException(`工作流需要工具：${missingTools.join('、')}，请先在智能体工具中勾选`)
    }
  }

  private collectWorkflowRequiredToolCodes(nodes: Array<{ type: string; config: Prisma.JsonValue }>) {
    const requiredToolCodes = new Set<string>()
    nodes.forEach((node) => {
      const config = this.normalizeNodeConfig(node.config)
      if (node.type === 'knowledge') {
        requiredToolCodes.add('search_knowledge')
      }
      if (node.type === 'tool' && config.toolCode) {
        requiredToolCodes.add(String(config.toolCode))
      }
    })
    return Array.from(requiredToolCodes)
  }

  private collectWorkflowPromptIds(nodes: Array<{ type: string; config: Prisma.JsonValue }>) {
    const promptIds = new Set<string>()
    nodes.forEach((node) => {
      const config = this.normalizeNodeConfig(node.config)
      if (node.type === 'prompt' && config.promptId) {
        promptIds.add(String(config.promptId))
      }
    })
    return Array.from(promptIds)
  }

  private normalizeNodeConfig(config: Prisma.JsonValue) {
    return config && typeof config === 'object' && !Array.isArray(config) ? (config as Record<string, unknown>) : {}
  }
}
