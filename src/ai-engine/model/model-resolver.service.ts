import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type { LlmOptions } from '../llm/llm.service'

@Injectable()
export class ModelResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveDefault(): Promise<LlmOptions> {
    return this.resolve()
  }

  async resolve(modelConfigId?: string | null, legacyModel?: string | null): Promise<LlmOptions> {
    // 模型运行配置统一由数据库模型配置和供应商 apiKeyEnv 解析，避免聊天链路各处散落默认模型或密钥读取。
    const modelConfig = modelConfigId
      ? await this.findEnabledModelById(modelConfigId)
      : legacyModel
        ? await this.findEnabledModelByName(legacyModel) || await this.findDefaultModel('chat')
        : await this.findDefaultModel('chat')

    if (modelConfigId && !modelConfig) {
      throw new BadRequestException('模型配置不存在或已停用')
    }

    if (!modelConfig) {
      throw new BadRequestException('No enabled default chat model config')
    }

    const apiKey = process.env[modelConfig.provider.apiKeyEnv]
    if (!apiKey) {
      throw new BadRequestException('模型供应商密钥未配置')
    }
    return {
      provider: modelConfig.provider.code,
      model: modelConfig.modelName,
      baseUrl: modelConfig.provider.baseUrl,
      apiKey,
    }
  }

  private findEnabledModelById(id: string) {
    return this.prisma.aiModelConfig.findFirst({
      where: {
        id,
        modelType: 'chat',
        status: 1,
        provider: { status: 1 },
      },
      select: this.modelSelect(),
    })
  }

  private findDefaultModel(modelType: string) {
    return this.prisma.aiModelConfig.findFirst({
      where: {
        modelType,
        isDefault: true,
        status: 1,
        provider: { status: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      select: this.modelSelect(),
    })
  }

  private findEnabledModelByName(modelName: string) {
    return this.prisma.aiModelConfig.findFirst({
      where: {
        modelName,
        modelType: 'chat',
        status: 1,
        provider: { status: 1 },
      },
      select: this.modelSelect(),
    })
  }

  private modelSelect() {
    return {
      modelName: true,
      provider: {
        select: {
          code: true,
          baseUrl: true,
          apiKeyEnv: true,
        },
      },
    }
  }
}
