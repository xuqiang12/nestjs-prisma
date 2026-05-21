import { Module, OnModuleInit } from '@nestjs/common'
import { ChatController } from './chat/chat.controller'
import { ChatService } from './chat/chat.service'
import { KnowledgeController } from './knowledge/knowledge.controller'
import { KnowledgeService } from './knowledge/knowledge.service'
import { AIRegistry } from '../../ai-engine/core/ai.registry'
import { registerKnowledgeBotAI } from './ai/register'

@Module({
  controllers: [ChatController, KnowledgeController],
  providers: [ChatService, KnowledgeService],
})
export class KnowledgeBotModule implements OnModuleInit {
  constructor(private registry: AIRegistry) {}

  onModuleInit() {
    // 模块初始化时自动注册 AI 插件
    registerKnowledgeBotAI(this.registry)
  }
}
