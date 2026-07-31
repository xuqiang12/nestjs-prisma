import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ChatMessage } from '../../../ai-engine/llm/llm.service'
import { ChatMode } from '../chat/dto/chat.dto'
import { ConversationListDto } from './dto/conversation.dto'

type MessageRole = 'user' | 'assistant'

type MessageSource = Record<string, any>

const ROLE_MARKER_PATTERN = /(^|\n)\s*(user|assistant|system)\s*(\n|$)/i

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  // 查询当前用户的会话列表，并支持按聊天模式过滤。
  async list(userId: string, query: ConversationListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 20)
    const where = {
      userId,
      isDeleted: false,
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.agentCode ? { agentCode: query.agentCode } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          mode: true,
          agentCode: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.aiConversation.count({ where }),
    ])

    return { list, total }
  }

  // 创建新的 AI 会话，并统一清洗标题。
  async create(userId: string, mode: ChatMode = 'chat', title = '新会话', agentCode?: string) {
    return this.prisma.aiConversation.create({
      data: {
        userId,
        mode,
        title: this.normalizeTitle(title),
        agentCode,
      },
    })
  }

  // 查询当前用户拥有的会话详情，并按时间正序带出消息记录。
  async detail(userId: string, id: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      throw new NotFoundException('会话不存在')
    }

    return conversation
  }

  // 重命名当前用户拥有的会话。
  async rename(userId: string, id: string, title: string) {
    await this.ensureOwnedConversation(userId, id)
    return this.prisma.aiConversation.update({
      where: { id },
      data: { title: this.normalizeTitle(title) },
    })
  }

  // 软删除当前用户拥有的会话，保留历史数据用于后续审计或恢复。
  async delete(userId: string, id: string) {
    await this.ensureOwnedConversation(userId, id)
    await this.prisma.aiConversation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    return { success: true }
  }

  // 发送消息前获取已有会话；没有传会话 ID 时自动创建一个新会话。
  async getOrCreateForMessage(
    userId: string,
    params: { conversationId?: string; message: string; mode?: ChatMode; agentCode?: string },
  ) {
    if (params.conversationId) {
      const conversation = await this.prisma.aiConversation.findFirst({
        where: {
          id: params.conversationId,
          userId,
          isDeleted: false,
        },
      })

      if (!conversation) {
        throw new NotFoundException('会话不存在')
      }

      return conversation
    }

    return this.prisma.aiConversation.create({
      data: {
        userId,
        mode: params.mode || 'chat',
        title: this.buildTitle(params.message),
        agentCode: params.agentCode,
      },
    })
  }

  // 读取最近的历史消息，并转换为大模型可直接使用的 ChatMessage。
  async getHistoryMessages(conversationId: string, limit = 20): Promise<ChatMessage[]> {
    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        role: true,
        content: true,
      },
    })

    return messages
      .reverse()
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .filter((item) => item.role !== 'assistant' || this.isCleanAssistantHistoryContent(item.content))
      .map((item) => ({ role: item.role as MessageRole, content: item.content }))
  }

  // 向指定会话追加一条消息，可选保存知识库来源信息。
  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    sources?: MessageSource[],
    meta: { agentCode?: string; promptId?: string; workflowCode?: string } = {},
  ) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId,
        role,
        content,
        sources: sources && sources.length ? sources : undefined,
        agentCode: meta.agentCode,
        promptId: meta.promptId,
        workflowCode: meta.workflowCode,
      },
    })
  }

  // 刷新会话更新时间，让列表按最近对话排序。
  async touchConversation(id: string) {
    return this.prisma.aiConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })
  }

  // 校验会话是否属于当前用户，避免跨用户读取或修改。
  private async ensureOwnedConversation(userId: string, id: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    })

    if (!conversation) {
      throw new NotFoundException('会话不存在')
    }

    return conversation
  }

  // 根据用户首条消息生成默认标题，并限制标题长度。
  private buildTitle(message: string) {
    return this.normalizeTitle(message).slice(0, 30)
  }

  // 清理标题两端空白，空标题统一使用默认会话名。
  private normalizeTitle(title: string) {
    return title.trim() || '新会话'
  }

  private isCleanAssistantHistoryContent(content: string) {
    return !ROLE_MARKER_PATTERN.test(content)
  }
}
