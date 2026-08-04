import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { CreateModelConfigDto, ModelConfigListDto, ModelConfigStatusDto, UpdateModelConfigDto } from './dto/model-config.dto'

@Injectable()
export class ModelConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ModelConfigListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiModelConfigWhereInput = {
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
      ...(query.modelType ? { modelType: query.modelType } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }
    const [list, total] = await Promise.all([
      this.prisma.aiModelConfig.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: { provider: true },
      }),
      this.prisma.aiModelConfig.count({ where }),
    ])
    return { list, total }
  }

  async options() {
    const list = await this.prisma.aiModelConfig.findMany({
      where: { status: 1, provider: { status: 1 } },
      orderBy: [{ modelType: 'asc' }, { updatedAt: 'desc' }],
      include: { provider: true },
    })
    return list.map((item) => this.toOption(item))
  }

  async create(dto: CreateModelConfigDto) {
    const modelType = dto.modelType || 'chat'
    this.ensureModelInput({ ...dto, modelType })
    await this.ensureEnabledProvider(dto.providerId)
    await this.ensureUniqueCode(dto.code)

    await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault && (dto.status ?? 1) === 1) {
        await tx.aiModelConfig.updateMany({
          where: { modelType, isDefault: true },
          data: { isDefault: false },
        })
      }
      await tx.aiModelConfig.create({
        data: {
          providerId: dto.providerId,
          name: dto.name,
          code: dto.code,
          modelName: dto.modelName,
          modelType,
          capabilities: dto.capabilities as Prisma.InputJsonValue,
          isDefault: dto.isDefault ?? false,
          status: dto.status ?? 1,
          remark: dto.remark,
        },
      })
    })
    return '模型配置新增成功'
  }

  async update(dto: UpdateModelConfigDto) {
    const current = await this.ensureModelConfig(dto.id)
    const modelType = dto.modelType || current.modelType
    this.ensureModelInput({ ...current, ...dto, modelType })
    if (dto.providerId) {
      await this.ensureEnabledProvider(dto.providerId)
    }
    if (dto.code && dto.code !== current.code) {
      await this.ensureUniqueCode(dto.code)
    }

    await this.prisma.$transaction(async (tx) => {
      const target = {
        modelType,
        isDefault: dto.isDefault ?? current.isDefault,
        status: dto.status ?? current.status,
      }
      if (target.isDefault && target.status === 1) {
        await tx.aiModelConfig.updateMany({
          where: { id: { not: dto.id }, modelType: target.modelType, isDefault: true },
          data: { isDefault: false },
        })
      }
      await tx.aiModelConfig.update({
        where: { id: dto.id },
        data: {
          providerId: dto.providerId,
          name: dto.name,
          code: dto.code,
          modelName: dto.modelName,
          modelType: dto.modelType,
          capabilities: dto.capabilities as Prisma.InputJsonValue,
          isDefault: dto.isDefault,
          status: dto.status,
          remark: dto.remark,
        },
      })
    })
    return '模型配置修改成功'
  }

  async updateStatus(dto: ModelConfigStatusDto) {
    const target = await this.ensureModelConfig(dto.id)
    if (dto.status === 1) {
      await this.ensureEnabledProvider(target.providerId)
    }
    await this.prisma.$transaction(async (tx) => {
      if (dto.status === 1 && target.isDefault) {
        await tx.aiModelConfig.updateMany({
          where: { id: { not: target.id }, modelType: target.modelType, isDefault: true },
          data: { isDefault: false },
        })
      }
      await tx.aiModelConfig.update({
        where: { id: dto.id },
        data: { status: dto.status },
      })
    })
    return '模型配置状态修改成功'
  }

  private ensureModelInput(dto: { name?: string; code?: string; modelName?: string; modelType?: string; capabilities?: unknown }) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('模型名称不能为空')
    }
    if (!dto.code?.trim()) {
      throw new BadRequestException('模型编码不能为空')
    }
    if (!dto.modelName?.trim()) {
      throw new BadRequestException('模型标识不能为空')
    }
    if (!dto.modelType?.trim()) {
      throw new BadRequestException('模型类型不能为空')
    }
    if (dto.capabilities !== undefined && (dto.capabilities === null || typeof dto.capabilities !== 'object' || Array.isArray(dto.capabilities))) {
      throw new BadRequestException('模型能力必须是 JSON 对象')
    }
  }

  private async ensureEnabledProvider(providerId: string) {
    const provider = await this.prisma.aiModelProvider.findFirst({ where: { id: providerId, status: 1 } })
    if (!provider) {
      throw new BadRequestException('模型供应商不存在或未启用')
    }
  }

  private async ensureUniqueCode(code: string) {
    const exists = await this.prisma.aiModelConfig.findUnique({ where: { code } })
    if (exists) {
      throw new BadRequestException('模型编码已存在')
    }
  }

  private async ensureModelConfig(id: string) {
    const modelConfig = await this.prisma.aiModelConfig.findUnique({ where: { id } })
    if (!modelConfig) {
      throw new NotFoundException('模型配置不存在')
    }
    return modelConfig
  }

  private toOption(item: Prisma.AiModelConfigGetPayload<{ include: { provider: true } }>) {
    return {
      id: item.id,
      value: item.id,
      label: item.name,
      code: item.code,
      provider: item.provider.name,
      providerCode: item.provider.code,
      baseUrl: item.provider.baseUrl,
      apiKeyEnv: item.provider.apiKeyEnv,
      modelName: item.modelName,
      modelType: item.modelType,
      capabilities: item.capabilities,
      isDefault: item.isDefault,
    }
  }
}
