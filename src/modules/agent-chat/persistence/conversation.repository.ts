// 读取新版智能体对话需要的会话历史数据。
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ChatMessage } from '../../../ai-engine/llm/llm.service'

type MessageRole = 'user' | 'assistant'

const ROLE_MARKER_PATTERN = /(^|\n)\s*(user|assistant|system)\s*(\n|$)/i

@Injectable()
export class ConversationRepository {
  // 注入 Prisma 以便统一读取 v2 对话历史。
  constructor(private readonly prisma: PrismaService) {}

  // 读取会话最近历史消息，并清洗不适合再次进入模型的 assistant 内容。
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

  // 判断 assistant 历史内容是否不含角色模板标记。
  private isCleanAssistantHistoryContent(content: string) {
    return !ROLE_MARKER_PATTERN.test(content)
  }
}
