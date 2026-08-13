// 提供运行时内置知识库搜索工具。
import { Injectable } from '@nestjs/common'
import { VectorStoreService } from '../../vector/vector-store.service'
import { BuiltinTool, ToolDefinition, ToolRuntimeContext } from '../tool.types'

@Injectable()
export class SearchKnowledgeTool implements BuiltinTool {
  definition: ToolDefinition = {
    code: 'search_knowledge',
    name: '搜索知识库',
    description: '搜索知识库内容',
    source: 'builtin',
    exposure: 'internal',
    enabled: true,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'integer', description: '返回数量' },
        tags: { type: 'array', description: '知识标签', items: { type: 'string' } },
        knowledgeBaseIds: { type: 'array', description: '知识库ID列表', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
    params: {
      query: '搜索关键词',
      limit: '返回数量',
      tags: '知识标签',
      knowledgeBaseIds: '知识库ID列表',
    },
  }

  // 注入向量检索服务以执行知识库搜索。
  constructor(private readonly vectorStore: VectorStoreService) {}

  // 返回运行时工具注册表可识别的知识库搜索工具定义。
  getToolDefinition(): ToolDefinition {
    return this.definition
  }

  // 执行知识库向量检索并返回查询和结果。
  async execute(input: unknown, _context: ToolRuntimeContext) {
    const params = input && typeof input === 'object' ? input as { query?: string; limit?: number; tags?: string[]; knowledgeBaseIds?: string[] } : {}
    const query = String(params?.query || '')
    const limit = params?.limit ? Number(params.limit) : 5
    const tags = Array.isArray(params?.tags) ? params.tags : undefined
    const knowledgeBaseIds = Array.isArray(params?.knowledgeBaseIds) ? params.knowledgeBaseIds : undefined
    const results = await this.vectorStore.similaritySearch(query, limit, { tags, knowledgeBaseIds })
    return { query, results }
  }
}
