// 提供 AI 技能包管理和安装到智能体的配置能力。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { RuntimeToolRegistry } from '../../../ai-runtime/tools/runtime-tool-registry.service'
import {
  CreateSkillPackageDto,
  InstallSkillPackageDto,
  SkillPackageListDto,
  SkillPackageStatusDto,
  UpdateSkillPackageDto,
} from './dto/skill-package.dto'

@Injectable()
export class SkillPackageService {
  // 注入 Prisma 和运行时工具注册表以校验技能包引用。
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RuntimeToolRegistry,
  ) {}

  // 分页查询技能包配置并按更新时间倒序返回。
  async list(query: SkillPackageListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiSkillPackageWhereInput = {
      ...(query.code ? { code: { contains: query.code, mode: 'insensitive' } } : {}),
      ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiSkillPackage.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.aiSkillPackage.count({ where }),
    ])
    return { list, total }
  }

  // 查询单个技能包配置详情。
  async detail(id: string) {
    return this.ensurePackage(id)
  }

  // 创建技能包并校验其引用的提示词、工作流和工具。
  async create(dto: CreateSkillPackageDto) {
    await this.ensureUniqueCode(dto.code)
    await this.validateReferences(dto)
    await this.prisma.aiSkillPackage.create({
      data: this.toPackageData(dto),
    })
    return '技能包新增成功'
  }

  // 更新技能包配置并重新校验引用边界。
  async update(dto: UpdateSkillPackageDto) {
    const skillPackage = await this.ensurePackage(dto.id)
    if (dto.code && dto.code !== skillPackage.code) {
      await this.ensureUniqueCode(dto.code, dto.id)
    }
    await this.validateReferences(dto)
    await this.prisma.aiSkillPackage.update({
      where: { id: dto.id },
      data: this.toPackageData(dto),
    })
    return '技能包修改成功'
  }

  // 更新技能包启停状态。
  async updateStatus(dto: SkillPackageStatusDto) {
    await this.ensurePackage(dto.id)
    await this.prisma.aiSkillPackage.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '技能包状态修改成功'
  }

  // 将技能包配置安装到智能体并合并工具能力。
  async installToAgent(dto: InstallSkillPackageDto) {
    const skillPackage = await this.ensurePackage(dto.packageId)
    if (skillPackage.status !== 1) {
      throw new BadRequestException('技能包未启用，不能安装')
    }
    const agent = await this.prisma.aiAgent.findUnique({ where: { id: dto.agentId } })
    if (!agent) {
      throw new NotFoundException('智能体不存在')
    }

    const defaults: Record<string, any> = this.isRecord(skillPackage.agentDefaults) ? skillPackage.agentDefaults : {}
    const promptIds = this.normalizeStringArray(skillPackage.promptIds)
    const toolCodes = this.normalizeStringArray(skillPackage.toolCodes)
    const agentToolCodes = this.normalizeStringArray(agent.toolCodes)
    const effectiveToolCodes = Array.from(new Set([...agentToolCodes, ...toolCodes]))
    this.ensureConfigurableTools(effectiveToolCodes)
    await this.prisma.aiAgent.update({
      where: { id: dto.agentId },
      data: {
        promptId: typeof defaults.promptId === 'string' ? defaults.promptId : promptIds[0] || agent.promptId,
        mode: typeof defaults.mode === 'string' ? defaults.mode : agent.mode,
        model: typeof defaults.model === 'string' ? defaults.model : agent.model,
        temperature: typeof defaults.temperature === 'number' ? defaults.temperature : agent.temperature,
        topP: typeof defaults.topP === 'number' ? defaults.topP : agent.topP,
        knowledgeEnabled: typeof defaults.knowledgeEnabled === 'boolean' ? defaults.knowledgeEnabled : agent.knowledgeEnabled,
        toolCodes: effectiveToolCodes as Prisma.InputJsonValue,
        workflowCode: skillPackage.workflowCode || agent.workflowCode,
      },
    })
    return '技能包安装成功'
  }

  // 将 DTO 转换为技能包表可保存的数据结构。
  private toPackageData(dto: CreateSkillPackageDto | UpdateSkillPackageDto) {
    return {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      promptIds: dto.promptIds as Prisma.InputJsonValue,
      toolCodes: dto.toolCodes as Prisma.InputJsonValue,
      workflowCode: dto.workflowCode,
      agentDefaults: dto.agentDefaults as Prisma.InputJsonValue,
      status: dto.status,
      remark: dto.remark,
    }
  }

  // 校验技能包引用的提示词、工作流和工具是否可用。
  private async validateReferences(dto: CreateSkillPackageDto | UpdateSkillPackageDto) {
    if (dto.promptIds?.length) {
      const count = await this.prisma.aiPrompt.count({
        where: { id: { in: dto.promptIds }, status: 1 },
      })
      if (count !== new Set(dto.promptIds).size) {
        throw new BadRequestException('技能包引用了不存在或未启用的提示词')
      }
    }

    if (dto.workflowCode) {
      const workflow = await this.prisma.aiWorkflow.findFirst({
        where: { code: dto.workflowCode, status: 1 },
      })
      if (!workflow) {
        throw new BadRequestException('技能包引用的工作流不存在或未启用')
      }
    }

    this.ensureConfigurableTools(dto.toolCodes)
  }

  // 校验技能包只能保存或安装可分配给普通 Agent 的工具。
  private ensureConfigurableTools(toolCodes?: string[]) {
    if (!toolCodes || !toolCodes.length) {
      return
    }

    const invalidTool = toolCodes.find((code) => {
      const tool = this.registry.getTool(code)
      return !tool || !tool.enabled || tool.exposure !== 'agent'
    })
    if (invalidTool) {
      throw new BadRequestException(`工具不可配置：${invalidTool}`)
    }
  }

  // 查询技能包并在不存在时抛出业务异常。
  private async ensurePackage(id: string) {
    const skillPackage = await this.prisma.aiSkillPackage.findUnique({ where: { id } })
    if (!skillPackage) {
      throw new NotFoundException('技能包不存在')
    }
    return skillPackage
  }

  // 校验技能包编码在当前表内保持唯一。
  private async ensureUniqueCode(code: string, excludeId?: string) {
    const existed = await this.prisma.aiSkillPackage.findFirst({
      where: {
        code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
    if (existed) {
      throw new BadRequestException('技能包编码已存在')
    }
  }

  // 将 JSON 字段规整为字符串数组。
  private normalizeStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }

  // 判断 JSON 字段是否为普通对象。
  private isRecord(value: Prisma.JsonValue): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
  }
}
