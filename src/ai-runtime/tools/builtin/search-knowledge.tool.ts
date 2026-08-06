// 提供运行时内置知识库搜索工具。
import { Injectable } from '@nestjs/common'
import { VectorStoreService } from '../../vector/vector-store.service'
import { ToolDefinition } from '../tool.types'

@Injectable()
export class SearchKnowledgeTool {
  // 注入向量检索服务以执行知识库搜索。
  constructor(private readonly vectorStore: VectorStoreService) {}

  // 返回运行时工具注册表可识别的知识库搜索工具定义。
  getToolDefinition(): ToolDefinition {
    return {
      name: 'search_knowledge',
      description: '搜索知识库内容',
      params: {
        query: '搜索关键词',
        limit: '返回数量',
        tags: '知识标签',
        knowledgeBaseIds: '知识库ID列表',
      },
      handler: async (params: any) => this.execute(params),
    }
  }

  // 执行知识库向量检索并返回查询和结果。
  async execute(params: { query?: string; limit?: number; tags?: string[]; knowledgeBaseIds?: string[] }) {
    const query = String(params?.query || '')
    const limit = params?.limit ? Number(params.limit) : 5
    const tags = Array.isArray(params?.tags) ? params.tags : undefined
    const knowledgeBaseIds = Array.isArray(params?.knowledgeBaseIds) ? params.knowledgeBaseIds : undefined
    const results = await this.vectorStore.similaritySearch(query, limit, { tags, knowledgeBaseIds })
    return { query, results }
  }
}
