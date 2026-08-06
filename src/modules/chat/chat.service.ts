// 处理 V2 普通聊天的安全检查、模型调用和消息保存闭环。
import { Injectable } from '@nestjs/common'
import { LlmService } from '../../ai-engine/llm/llm.service'
import { ModelResolverService } from '../../ai-engine/model/model-resolver.service'
import { SensitiveWordCheckerService } from '../../ai-engine/safety/sensitive-word-checker.service'
import { ChatRequestDto } from './dto/chat.dto'
import { ChatConversationRepository } from './persistence/chat-conversation.repository'

@Injectable()
export class ChatService {
  // 注入普通聊天所需的安全、模型和会话持久化依赖。
  constructor(
    private readonly sensitiveWordChecker: SensitiveWordCheckerService,
    private readonly modelResolver: ModelResolverService,
    private readonly llmService: LlmService,
    private readonly conversationRepository: ChatConversationRepository,
  ) {}

  // 处理一次普通聊天请求，并返回会话 ID 和助手回答。
  async chat(body: ChatRequestDto, userId: string) {
    const input = await this.sensitiveWordChecker.checkAndApply(body.message, 'input')
    const conversation = await this.conversationRepository.getOrCreateConversation(
      userId,
      input.content,
      body.conversationId,
    )
    const history = await this.conversationRepository.getHistoryMessages(conversation.id)

    await this.conversationRepository.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content: input.content,
    })

    const model = await this.modelResolver.resolveDefault()
    const answer = await this.llmService.invokeWithMessages(
      [...history, { role: 'user', content: input.content }],
      {
        ...model,
        finalAnswerGuard: true,
        roleTemplateStops: true,
      },
    )
    const output = await this.sensitiveWordChecker.checkAndApply(answer, 'output')

    await this.conversationRepository.saveMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: output.content,
    })
    await this.conversationRepository.touchConversation(conversation.id)

    return {
      conversationId: conversation.id,
      answer: output.content,
    }
  }
}
