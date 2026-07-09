import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ChatMessage } from '../../../ai-engine/llm/llm.service'
import { ChatMode } from '../chat/dto/chat.dto'
import { ConversationListDto } from './dto/conversation.dto'

type MessageRole = 'user' | 'assistant'

type MessageSource = Record<string, any>

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, query: ConversationListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 20)
    const where = {
      userId,
      isDeleted: false,
      ...(query.mode ? { mode: query.mode } : {}),
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
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.aiConversation.count({ where }),
    ])

    return { list, total }
  }

  async create(userId: number, mode: ChatMode = 'chat', title = '新会话') {
    return this.prisma.aiConversation.create({
      data: {
        userId,
        mode,
        title: this.normalizeTitle(title),
      },
    })
  }

  async detail(userId: number, id: string) {
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

  async rename(userId: number, id: string, title: string) {
    await this.ensureOwnedConversation(userId, id)
    return this.prisma.aiConversation.update({
      where: { id },
      data: { title: this.normalizeTitle(title) },
    })
  }

  async delete(userId: number, id: string) {
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

  async getOrCreateForMessage(
    userId: number,
    params: { conversationId?: string; message: string; mode?: ChatMode },
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

    return this.create(userId, params.mode || 'chat', this.buildTitle(params.message))
  }

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
      .map((item) => ({ role: item.role as MessageRole, content: item.content }))
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    sources?: MessageSource[],
  ) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId,
        role,
        content,
        sources: sources && sources.length ? sources : undefined,
      },
    })
  }

  async touchConversation(id: string) {
    return this.prisma.aiConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })
  }

  private async ensureOwnedConversation(userId: number, id: string) {
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

  private buildTitle(message: string) {
    return this.normalizeTitle(message).slice(0, 30)
  }

  private normalizeTitle(title: string) {
    return title.trim() || '新会话'
  }
}
