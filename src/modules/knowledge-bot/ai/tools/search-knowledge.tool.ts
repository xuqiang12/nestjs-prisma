import { Injectable } from '@nestjs/common'
import { ToolDefinition } from '../../../../ai-engine/tools/tool.types'
import { VectorStoreService } from '../../../../ai-engine/vector/vector-store.service'

@Injectable()
export class SearchKnowledgeTool {
  constructor(private readonly vectorStore: VectorStoreService) {}

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

  async execute(params: { query?: string; limit?: number; tags?: string[]; knowledgeBaseIds?: string[] }) {
    const query = String(params?.query || '')
    const limit = params?.limit ? Number(params.limit) : 5
    const tags = Array.isArray(params?.tags) ? params.tags : undefined
    const knowledgeBaseIds = Array.isArray(params?.knowledgeBaseIds) ? params.knowledgeBaseIds : undefined
    const results = await this.vectorStore.similaritySearch(query, limit, { tags, knowledgeBaseIds })
    return { query, results }
  }
}
