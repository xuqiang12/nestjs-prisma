import { Module, OnModuleInit } from '@nestjs/common'
import { ChatController } from './chat/chat.controller'
import { ChatService } from './chat/chat.service'
import { KnowledgeBaseController } from './knowledge-base/knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base/knowledge-base.service'
import { KnowledgeStorageService } from './knowledge-base/knowledge-storage.service'
import { ConversationController } from './conversation/conversation.controller'
import { ConversationService } from './conversation/conversation.service'
import { AIRegistry } from '../../ai-engine/core/ai.registry'
import { registerKnowledgeBotAI } from './ai/register'
import { SearchKnowledgeTool } from './ai/tools/search-knowledge.tool'
import { GetUserMenuPermissionsTool } from './ai/tools/get-user-menu-permissions.tool'

@Module({
  controllers: [ChatController, KnowledgeBaseController, ConversationController],
  providers: [ChatService, KnowledgeBaseService, KnowledgeStorageService, ConversationService, SearchKnowledgeTool, GetUserMenuPermissionsTool],
})
export class KnowledgeBotModule implements OnModuleInit {
  constructor(
    private registry: AIRegistry,
    private searchKnowledgeTool: SearchKnowledgeTool,
    private getUserMenuPermissionsTool: GetUserMenuPermissionsTool,
  ) {}

  // 模块启动后把 knowledge-bot 相关 AI 工具注册到全局 AIRegistry。
  onModuleInit() {
    // 模块初始化时自动注册 AI 插件，传入需要依赖注入的工具
    registerKnowledgeBotAI(this.registry, this.searchKnowledgeTool, this.getUserMenuPermissionsTool)
  }
}
