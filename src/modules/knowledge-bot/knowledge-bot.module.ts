import { Module, OnModuleInit } from '@nestjs/common'
import { ChatController } from './chat/chat.controller'
import { ChatService } from './chat/chat.service'
import { KnowledgeController } from './knowledge/knowledge.controller'
import { KnowledgeService } from './knowledge/knowledge.service'
import { AIRegistry } from '../../ai-engine/core/ai.registry'
import { registerKnowledgeBotAI } from './ai/register'
import { GetUserMenuPermissionsTool } from './ai/tools/get-user-menu-permissions.tool'

@Module({
  controllers: [ChatController, KnowledgeController],
  providers: [ChatService, KnowledgeService, GetUserMenuPermissionsTool],
})
export class KnowledgeBotModule implements OnModuleInit {
  constructor(
    private registry: AIRegistry,
    private getUserMenuPermissionsTool: GetUserMenuPermissionsTool,
  ) {}

  onModuleInit() {
    // 模块初始化时自动注册 AI 插件，传入需要依赖注入的工具
    registerKnowledgeBotAI(this.registry, this.getUserMenuPermissionsTool)
  }
}
