// 注册 V2 普通聊天入口模块。
import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatConversationRepository } from './persistence/chat-conversation.repository'

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatConversationRepository],
})
export class ChatModule {}
