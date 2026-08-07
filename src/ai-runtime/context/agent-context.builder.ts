// 构建新版智能体运行时所需的统一上下文。
import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { ModelResolverService } from '../model/model-resolver.service'
import { ConversationRepository } from '../../modules/agent-chat/persistence/conversation.repository'
import { AgentRuntimeRequest } from '../agent-runtime.types'
import { AgentContext } from './agent-context.types'

@Injectable()
export class AgentContextBuilder {
  // 注入配置读取、模型解析和历史读取依赖。
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelResolver: ModelResolverService,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  // 通过 agentCode 把一次请求解析成后续 Planner 和 Handler 共用的运行上下文。
  async build(request: AgentRuntimeRequest): Promise<AgentContext> {
    const agent = await this.prisma.aiAgent.findFirst({
      where: { code: request.agent.code, status: 1 },
      include: {
        knowledgeBases: {
          where: { knowledgeBase: { status: 1 } },
          select: { knowledgeBaseId: true },
        },
      },
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

    const model = await this.modelResolver.resolve(agent.modelConfigId, agent.model)
    const history = await this.conversationRepository.getHistoryMessages(request.conversation.id)

    return {
      agent: {
        id: agent.id,
        code: agent.code,
        name: agent.name,
        mode: agent.mode,
      },
      user: {
        id: request.user.id,
        roles: request.user.roles || [],
        permissions: request.user.permissions || [],
      },
      conversation: {
        id: request.conversation.id,
      },
      message: {
        content: request.message.content,
      },
      history,
      prompt: {
        id: prompt.id,
        system: this.buildSystemPrompt(agent.promptSnapshot || prompt.content, agent.promptEnhancement),
      },
      model: {
        ...model,
        temperature: agent.temperature ?? undefined,
        topP: agent.topP ?? undefined,
      },
      capabilities: {
        knowledgeEnabled: agent.knowledgeEnabled,
        knowledgeStrict: agent.knowledgeStrict,
        knowledgeBaseIds: agent.knowledgeBases.map((item) => item.knowledgeBaseId),
        knowledgeTags: this.normalizeStringArray(agent.knowledgeTags),
        toolCodes: this.normalizeToolCodes(agent.toolCodes),
        workflowCode: agent.workflowCode || undefined,
      },
      execution: {
        maxSteps: 1,
      },
      metadata: request.metadata,
    }
  }

  // 拼出智能体最终系统提示词，保留 promptSnapshot 和增强提示的组合规则。
  private buildSystemPrompt(basePrompt: string, promptEnhancement?: string | null) {
    return [basePrompt, promptEnhancement].filter(Boolean).join('\n\n')
  }

  // 把 Prisma JSON 字段规整为字符串数组。
  private normalizeStringArray(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter((item): item is string => typeof item === 'string' && !!item.trim())
  }

  // 把工具授权 JSON 字段规整为工具编码数组。
  private normalizeToolCodes(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter((item): item is string => typeof item === 'string' && !!item.trim())
  }
}
