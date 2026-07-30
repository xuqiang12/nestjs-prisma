/**
 * Knowledge Bot 业务模块 AI 注册入口
 *
 * 这是 knowledge-bot 业务模块的统一 AI 注册入口
 * 所有 knowledge-bot 相关的工具、工作流都在这里注册
 */
import { AIRegistry } from '../../../ai-engine/core/ai.registry'
import { SearchKnowledgeTool } from './tools/search-knowledge.tool'
import { GetUserMenuPermissionsTool } from './tools/get-user-menu-permissions.tool'

// 注册 knowledge-bot 暴露给 AI 编排层使用的工具集合。
export function registerKnowledgeBotAI(
  registry: AIRegistry,
  searchKnowledgeTool: SearchKnowledgeTool,
  getUserMenuPermissionsTool?: GetUserMenuPermissionsTool,
) {
  registry.registerTool(searchKnowledgeTool.getToolDefinition())

  if (getUserMenuPermissionsTool) {
    registry.registerTool(getUserMenuPermissionsTool.getToolDefinition())
  }
}
