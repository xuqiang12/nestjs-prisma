import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { PromptRendererService, PromptVariable } from '../prompt/prompt-renderer.service'
import { AgentRuntimeConfig } from './agent-runtime.types'

@Injectable()
export class AgentRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promptRenderer: PromptRendererService,
  ) {}

  async resolve(
    agentCode?: string,
    variables: Record<string, string | number | boolean | null | undefined> = {},
  ): Promise<AgentRuntimeConfig | null> {
    if (!agentCode) {
      return null
    }

    const agent = await this.prisma.aiAgent.findFirst({
      where: { code: agentCode, status: 1 },
    })
    if (!agent) {
      throw new BadRequestException('智能体不存在或未启用')
    }

    const prompt = await this.prisma.aiPrompt.findFirst({
      where: { code: agent.promptCode, status: 1 },
    })
    if (!prompt) {
      throw new BadRequestException('智能体绑定的提示词不存在或未启用')
    }
    return {
      agentCode: agent.code,
      promptCode: prompt.code,
      mode: agent.knowledgeEnabled
        ? 'knowledge'
        : agent.mode === 'knowledge'
          ? 'knowledge'
          : 'chat',
      systemPrompt: this.promptRenderer.render(
        prompt.content,
        this.normalizeVariables(prompt.variables),
        variables,
      ),
      llmOptions: {
        model: agent.model || undefined,
        temperature: agent.temperature ?? undefined,
        topP: agent.topP ?? undefined,
      },
      toolCodes: this.normalizeToolCodes(agent.toolCodes),
      workflowCode: agent.workflowCode || undefined,
    }
  }

  private normalizeVariables(value: Prisma.JsonValue): PromptVariable[] {
    if (!Array.isArray(value)) {
      return []
    }

    const items: unknown[] = value
    return items
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .filter((item) => typeof item.name === 'string')
      .map((item) => ({
        name: item.name as string,
        required: Boolean(item.required),
      }))
  }

  private normalizeToolCodes(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter((item): item is string => typeof item === 'string')
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
  }
}
