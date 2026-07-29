import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { CreatePromptDto, PromptListDto, PromptStatusDto, UpdatePromptDto } from './dto/prompt.dto'

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PromptListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiPromptWhereInput = {
      ...(query.code ? { code: { contains: query.code, mode: 'insensitive' } } : {}),
      ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
      ...(query.scene ? { scene: query.scene } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiPrompt.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.aiPrompt.count({ where }),
    ])

    return { list, total }
  }

  async detail(id: string) {
    return this.ensurePrompt(id)
  }

  async create(dto: CreatePromptDto) {
    await this.prisma.aiPrompt.create({
      data: {
        code: this.generatePromptCode(),
        name: dto.name,
        scene: dto.scene,
        content: dto.content,
        version: dto.version || 1,
        status: dto.status ?? 1,
        remark: dto.remark,
      },
    })
    return '提示词新增成功'
  }

  async update(dto: UpdatePromptDto) {
    await this.ensurePrompt(dto.id)

    await this.prisma.aiPrompt.update({
      where: { id: dto.id },
      data: {
        name: dto.name,
        scene: dto.scene,
        content: dto.content,
        version: dto.version,
        status: dto.status,
        remark: dto.remark,
      },
    })
    return '提示词修改成功'
  }

  async updateStatus(dto: PromptStatusDto) {
    await this.ensurePrompt(dto.id)
    await this.prisma.aiPrompt.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '提示词状态修改成功'
  }

  async findEnabledByCode(code: string) {
    return this.prisma.aiPrompt.findFirst({
      where: { code, status: 1 },
    })
  }

  private async ensurePrompt(id: string) {
    const prompt = await this.prisma.aiPrompt.findUnique({ where: { id } })
    if (!prompt) {
      throw new NotFoundException('提示词不存在')
    }
    return prompt
  }

  private generatePromptCode() {
    return `prompt_${randomUUID().replace(/-/g, '')}`
  }
}
