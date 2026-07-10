// 知识库搜索工具 - knowledge-bot 业务模块示例
import { ToolDefinition } from '../../../../ai-engine/core/interfaces'

export const SearchKnowledgeTool: ToolDefinition = {
  name: 'search_knowledge',
  description: '搜索知识库内容',
  params: {
    query: '搜索关键词',
  },
  // 执行知识库搜索工具，目前返回演示数据用于验证工具调用链路。
  handler: async (params: any) => {
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
