import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { AgentRuntimeConfig } from './agent-runtime.types'

@Injectable()
export class AgentRuntimeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(agentCode?: string): Promise<AgentRuntimeConfig | null> {
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
      where: { id: agent.promptId, status: 1 },
    })
    if (!prompt) {
      throw new BadRequestException('智能体绑定的提示词不存在或未启用')
    }
    const basePrompt = agent.promptSyncEnabled === false && agent.promptSnapshot
      ? agent.promptSnapshot
      : prompt.content
    return {
      agentCode: agent.code,
      promptId: prompt.id,
      mode: agent.knowledgeEnabled
        ? 'knowledge'
        : agent.mode === 'knowledge'
          ? 'knowledge'
          : 'chat',
      systemPrompt: this.joinPrompt(basePrompt, agent.promptEnhancement),
      llmOptions: {
        model: agent.model || undefined,
        temperature: agent.temperature ?? undefined,
        topP: agent.topP ?? undefined,
      },
      toolCodes: this.normalizeToolCodes(agent.toolCodes),
      knowledgeStrict: agent.knowledgeStrict,
      promptEnhancement: agent.promptEnhancement || undefined,
      workflowCode: agent.workflowCode || undefined,
    }
  }
  private normalizeToolCodes(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter((item): item is string => typeof item === 'string')
  }

  private joinPrompt(...parts: Array<string | null | undefined>) {
    return parts
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join('\n\n')
  }
}
