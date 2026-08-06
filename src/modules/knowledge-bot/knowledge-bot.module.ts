// 注册知识机器人工具能力模块。
import { Module, OnModuleInit } from '@nestjs/common'
import { AIRegistry } from '../../ai-engine/core/ai.registry'
import { registerKnowledgeBotAI } from './ai/register'
import { SearchKnowledgeTool } from './ai/tools/search-knowledge.tool'
import { GetUserMenuPermissionsTool } from './ai/tools/get-user-menu-permissions.tool'

@Module({
  providers: [SearchKnowledgeTool, GetUserMenuPermissionsTool],
})
export class KnowledgeBotModule implements OnModuleInit {
  // 注入知识机器人工具注册所需的全局注册表和工具实例。
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
