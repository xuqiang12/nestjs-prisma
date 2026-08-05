import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import {
  CreateSensitiveWordDto,
  SensitiveWordListDto,
  SensitiveWordStatusDto,
  UpdateSensitiveWordDto,
} from './dto/sensitive-word.dto'

@Injectable()
export class SensitiveWordService {
  constructor(private readonly prisma: PrismaService) {}

  // 查询敏感词分页列表，并按筛选条件返回总数。
  async list(query: SensitiveWordListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiSensitiveWordWhereInput = {
      ...(query.word ? { word: { contains: query.word, mode: 'insensitive' } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.scope ? { scope: query.scope } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiSensitiveWord.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.aiSensitiveWord.count({ where }),
    ])

    return { list, total }
  }

  // 查询单个敏感词详情。
  async detail(id: string) {
    return this.ensureSensitiveWord(id)
  }

  // 创建新的敏感词配置。
  async create(dto: CreateSensitiveWordDto) {
    await this.ensureUniqueWord(dto.word, dto.scope)
    await this.prisma.aiSensitiveWord.create({
      data: {
        word: dto.word,
        category: dto.category,
        action: dto.action,
        replaceWith: dto.replaceWith,
        scope: dto.scope,
        status: dto.status ?? 1,
        remark: dto.remark,
      },
    })
    return '敏感词新增成功'
  }

  // 更新已有敏感词配置。
  async update(dto: UpdateSensitiveWordDto) {
    const word = await this.ensureSensitiveWord(dto.id)
    const nextWord = dto.word || word.word
    const nextScope = dto.scope || word.scope
    if (nextWord !== word.word || nextScope !== word.scope) {
      await this.ensureUniqueWord(nextWord, nextScope, dto.id)
    }

    await this.prisma.aiSensitiveWord.update({
      where: { id: dto.id },
      data: {
        word: dto.word,
        category: dto.category,
        action: dto.action,
        replaceWith: dto.replaceWith,
        scope: dto.scope,
        status: dto.status,
        remark: dto.remark,
      },
    })
    return '敏感词修改成功'
  }

  // 更新敏感词启用状态。
  async updateStatus(dto: SensitiveWordStatusDto) {
    await this.ensureSensitiveWord(dto.id)
    await this.prisma.aiSensitiveWord.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '敏感词状态修改成功'
  }

  // 确认敏感词存在并返回记录。
  private async ensureSensitiveWord(id: string) {
    const word = await this.prisma.aiSensitiveWord.findUnique({ where: { id } })
    if (!word) {
      throw new NotFoundException('敏感词不存在')
    }
    return word
  }

  // 校验同一范围内的敏感词是否唯一。
  private async ensureUniqueWord(word: string, scope: string, excludeId?: string) {
    const existed = await this.prisma.aiSensitiveWord.findFirst({
      where: {
        word,
        scope,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
    if (existed) {
      throw new BadRequestException('相同范围内的敏感词已存在')
    }
  }
}
