// 解析运行时需要的数据库模型配置和供应商连接参数。
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import type { LlmOptions } from '../llm/llm.service'

@Injectable()
export class ModelResolverService {
  // 注入 Prisma 以读取模型配置中心中的供应商和模型配置。
  constructor(private readonly prisma: PrismaService) {}

  // 解析默认启用的聊天模型配置。
  async resolveDefault(): Promise<LlmOptions> {
    return this.resolve()
  }

  // 按 Agent 绑定模型配置或旧模型名解析最终模型调用参数。
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

  // 查询指定 ID 的启用聊天模型配置。
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

  // 查询指定类型的默认启用模型配置。
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

  // 按旧模型名称查询启用聊天模型配置。
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

  // 返回运行时解析模型时需要读取的字段集合。
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
