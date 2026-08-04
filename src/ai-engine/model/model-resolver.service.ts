import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { LlmOptions } from '../llm/llm.service'

@Injectable()
export class ModelResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(modelConfigId?: string | null, legacyModel?: string | null): Promise<LlmOptions> {
    const modelConfig = modelConfigId
      ? await this.findEnabledModelById(modelConfigId)
      : await this.findDefaultModel('chat')

    if (modelConfigId && !modelConfig) {
      throw new BadRequestException('模型配置不存在或已停用')
    }

    if (modelConfig) {
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

    return {
      model: legacyModel || process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      baseUrl: process.env.SILICONFLOW_BASE_URL,
      apiKey: process.env.SILICONFLOW_API_KEY,
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
        modelType: 'chat',
        isDefault: true,
        status: 1,
        provider: { status: 1 },
      },
      orderBy: { updatedAt: 'desc' },
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
