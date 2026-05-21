import { Module } from '@nestjs/common'
import { ChatController } from './chat/chat.controller'
import { ChatService } from './chat/chat.service'
import { KnowledgeController } from './knowledge/knowledge.controller'
import { KnowledgeService } from './knowledge/knowledge.service'

@Module({
  controllers: [ChatController, KnowledgeController],
  providers: [ChatService, KnowledgeService],
})
export class KnowledgeBotModule {}
