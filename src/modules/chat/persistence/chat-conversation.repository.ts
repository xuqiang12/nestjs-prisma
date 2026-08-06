// 负责 V2 普通聊天会话和消息持久化。
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ChatMessage } from '../../../ai-runtime/llm/llm.service'

type MessageRole = 'user' | 'assistant'

const ROLE_MARKER_PATTERN = /(^|\n)\s*(user|assistant|system)\s*(\n|$)/i
const CONVERSATION_TITLE_MAX_LENGTH = 30

export type SaveChatMessageInput = {
  conversationId: string
  role: MessageRole
  content: string
}

@Injectable()
export class ChatConversationRepository {
  // 注入 Prisma 以读写普通聊天会话和消息。
  constructor(private readonly prisma: PrismaService) {}

  // 获取当前用户已有普通聊天会话，或按首条消息创建普通聊天会话。
  async getOrCreateConversation(userId: string, message: string, conversationId?: string) {
    if (conversationId) {
      const conversation = await this.prisma.aiConversation.findFirst({
        where: { id: conversationId, userId, isDeleted: false },
        select: { id: true },
      })
      if (!conversation) {
        throw new BadRequestException('会话不存在或无权访问')
      }
      return conversation
    }

    return this.prisma.aiConversation.create({
      data: {
        userId,
        title: this.buildConversationTitle(message),
        mode: 'chat',
      },
      select: { id: true },
    })
  }

  // 保存普通聊天的用户消息或助手消息。
  async saveMessage(input: SaveChatMessageInput) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
      },
      select: { id: true },
    })
  }

  // 读取普通聊天最近历史，并过滤不适合再次进入模型的助手内容。
  async getHistoryMessages(conversationId?: string, limit = 20): Promise<ChatMessage[]> {
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

    return messages
      .reverse()
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .filter((item) => item.role !== 'assistant' || this.isCleanAssistantHistoryContent(item.content))
      .map((item) => ({ role: item.role as MessageRole, content: item.content }))
  }

  // 刷新普通聊天会话更新时间，保证列表按最近对话排序。
  async touchConversation(conversationId: string) {
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })
  }

  // 判断助手历史内容是否不含角色模板标记。
  private isCleanAssistantHistoryContent(content: string) {
    return !ROLE_MARKER_PATTERN.test(content)
  }

  // 根据首条普通聊天消息生成会话标题。
  private buildConversationTitle(message: string) {
    const title = message.trim().slice(0, CONVERSATION_TITLE_MAX_LENGTH)
    return title || '新的普通对话'
  }
}
