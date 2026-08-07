// 读取新版智能体对话需要的会话历史数据。
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ExecutionTrace } from '../../../ai-runtime/trace/execution-trace.types'
import { ChatMessage } from '../../../ai-runtime/llm/llm.service'

type MessageRole = 'user' | 'assistant'

const ROLE_MARKER_PATTERN = /(^|\n)\s*(user|assistant|system)\s*(\n|$)/i
const CONVERSATION_TITLE_MAX_LENGTH = 30

export type SaveAgentMessageInput = {
  conversationId: string
  role: MessageRole
  content: string
  sources?: any[]
  executionTrace?: ExecutionTrace
  agentCode?: string
  promptId?: string
  workflowCode?: string
}

@Injectable()
export class ConversationRepository {
  // 注入 Prisma 以便统一读取 v2 对话历史。
  constructor(private readonly prisma: PrismaService) {}

  // 获取已有会话或为当前用户创建新的智能体会话。
  async getOrCreateConversation(userId: string, agentCode: string, message: string, conversationId?: string) {
    if (conversationId) {
      const conversation = await this.prisma.aiConversation.findFirst({
        where: { id: conversationId, isDeleted: false },
        select: { id: true, userId: true },
      })
      if (!conversation) {
        throw new BadRequestException('会话不存在或已删除')
      }
      if (conversation.userId !== userId) {
        throw new BadRequestException('无权访问该会话')
      }
      return { id: conversation.id }
    }

    return this.prisma.aiConversation.create({
      data: {
        userId,
        title: this.buildConversationTitle(message),
        mode: 'agent',
        agentCode,
      },
      select: { id: true },
    })
  }

  // 保存新版智能体对话消息及排查元数据。
  async saveMessage(input: SaveAgentMessageInput) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        sources: input.sources as any,
        executionTrace: input.executionTrace as any,
        agentCode: input.agentCode,
        promptId: input.promptId,
        workflowCode: input.workflowCode,
      },
      select: { id: true },
    })
  }

  // 刷新会话更新时间以便列表按最近对话排序。
  async touchConversation(conversationId: string) {
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })
  }

  // 读取会话最近历史消息，并从末尾排除本轮刚保存的用户问题。
  async getHistoryMessages(conversationId?: string, limit = 20, currentMessage?: string): Promise<ChatMessage[]> {
    if (!conversationId) {
      return []
    }

    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        role: true,
        content: true,
      },
    })

    const history = messages
      .reverse()
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .filter((item) => item.role !== 'assistant' || this.isCleanAssistantHistoryContent(item.content))
      .map((item) => ({ role: item.role as MessageRole, content: item.content }))

    return this.excludeCurrentMessageFromHistory(history, currentMessage)
  }

  // 判断 assistant 历史内容是否不含角色模板标记。
  private isCleanAssistantHistoryContent(content: string) {
    return !ROLE_MARKER_PATTERN.test(content)
  }

  // 只移除末尾与当前请求相同的用户消息，保留更早的同内容历史。
  private excludeCurrentMessageFromHistory(history: ChatMessage[], currentMessage?: string) {
    const normalizedMessage = currentMessage?.trim()
    const latest = history[history.length - 1]
    if (normalizedMessage && latest?.role === 'user' && latest.content.trim() === normalizedMessage) {
      return history.slice(0, -1)
    }
    return history
  }

  // 根据首条用户消息生成会话标题。
  private buildConversationTitle(message: string) {
    const title = message.trim().slice(0, CONVERSATION_TITLE_MAX_LENGTH)
    return title || '新的智能体对话'
  }
}
