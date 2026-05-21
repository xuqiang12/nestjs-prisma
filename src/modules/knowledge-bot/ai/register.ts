/**
 * Knowledge Bot 业务模块 AI 注册入口
 *
 * 这是 knowledge-bot 业务模块的统一 AI 注册入口
 * 所有 knowledge-bot 相关的工具、工作流都在这里注册
 */
import { AIRegistry } from '../../../ai-engine/core/ai.registry'
import { SearchKnowledgeTool } from './tools/search-knowledge.tool'
import { AddDocumentTool } from './tools/add-document.tool'
import { GetUserMenuPermissionsTool } from './tools/get-user-menu-permissions.tool'

export function registerKnowledgeBotAI(
  registry: AIRegistry,
  getUserMenuPermissionsTool?: GetUserMenuPermissionsTool,
) {
  console.log('========== 注册 Knowledge Bot AI 插件 ==========')

  // 1. 注册简单工具（不需要依赖注入）
  registry.registerTool(SearchKnowledgeTool)
  registry.registerTool(AddDocumentTool)

  // 2. 注册需要依赖注入的工具
  if (getUserMenuPermissionsTool) {
    registry.registerTool(getUserMenuPermissionsTool.getToolDefinition())
  }

  console.log('✅ Knowledge Bot AI 插件注册完成')
  console.log('   已注册工具:', registry.getToolNames())
}
