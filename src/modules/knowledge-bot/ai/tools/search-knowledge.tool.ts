/**
 * 知识库搜索工具 - knowledge-bot 业务模块示例
 */
import { ToolDefinition } from '../../../../ai-engine/core/interfaces'

export const SearchKnowledgeTool: ToolDefinition = {
  name: 'search_knowledge',
  description: '搜索知识库内容',
  params: {
    query: '搜索关键词',
  },
  handler: async (params: any) => {
    console.log('[SearchKnowledgeTool] 搜索知识库，关键词:', params.query)

    // 模拟知识库搜索
    return {
      query: params.query,
      results: [
        {
          id: '1',
          title: '如何使用AI助手',
          content: '详细介绍如何与AI助手进行交互...',
          score: 0.95,
        },
        {
          id: '2',
          title: '知识库常见问题',
          content: '收集了用户最常问的问题和答案...',
          score: 0.87,
        },
      ],
    }
  },
}
