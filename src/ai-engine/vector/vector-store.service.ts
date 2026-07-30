import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { EmbeddingService } from '../embedding/embedding.service'
import { splitText } from '../infra/text-chunker'

export type SearchResult = {
  id: string
  content: string
  metadata?: Record<string, any>
  distance: number
}

export type AddDocumentsResult = {
  success: boolean
  count: number
}

export type KnowledgeDocumentListItem = {
  id: string
  content: string
  metadata?: Record<string, any>
  createdAt: Date
}

type SearchOptions = {
  tags?: string[]
}

@Injectable()
export class VectorStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // 将原始知识内容切片、生成向量，并逐条写入 pgvector 文档表。
  async addDocuments(contents: string[], metadata?: Record<string, any>): Promise<AddDocumentsResult> {
    const chunks = contents.flatMap((content) => splitText(content))

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await this.embeddingService.createEmbedding(chunk)
      // 每个切片单独存储向量，chunkIndex 用来保留它在原始内容中的顺序。
      await this.prisma.$executeRaw`
        INSERT INTO documents (id, content, metadata, embedding)
        VALUES (
          gen_random_uuid(),
          ${chunk},
          ${JSON.stringify({ ...metadata, chunkIndex: i })}::jsonb,
          ${JSON.stringify(embedding)}::vector
        )
      `
    }

    return { success: true, count: chunks.length }
  }

  // 根据查询文本生成向量，并按 pgvector 距离从近到远返回相似知识片段。
  async similaritySearch(query: string, limit = 5, options: SearchOptions = {}): Promise<SearchResult[]> {
    const embedding = await this.embeddingService.createEmbedding(query)
    const tags = Array.from(new Set((options.tags || []).map((tag) => tag.trim()).filter(Boolean)))
    if (tags.length) {
      const scopedResult = await this.prisma.$queryRaw`
        SELECT
          id,
          content,
          metadata,
          embedding <=> ${JSON.stringify(embedding)}::vector AS distance
        FROM documents
        WHERE COALESCE(metadata->'tags', '[]'::jsonb) ?| ARRAY[${Prisma.join(tags)}]::text[]
        ORDER BY distance ASC
        LIMIT ${limit}
      `

      return scopedResult as SearchResult[]
    }

    // <=> 是 pgvector 的距离运算符，距离越小表示语义越接近。
    const result = await this.prisma.$queryRaw`
      SELECT
        id,
        content,
        metadata,
        embedding <=> ${JSON.stringify(embedding)}::vector AS distance
      FROM documents
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    return result as SearchResult[]
  }

  // 分页查询知识文档列表，供知识库管理页面展示。
  async list(pageNum = 1, pageSize = 10): Promise<{ list: KnowledgeDocumentListItem[]; total: number }> {
    const skip = (pageNum - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.document.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, metadata: true, createdAt: true },
      }),
      this.prisma.document.count(),
    ])

    return { list: list as KnowledgeDocumentListItem[], total }
  }

  // 按文档 ID 删除知识内容。
  async deleteById(id: string): Promise<{ success: boolean }> {
    await this.prisma.document.delete({ where: { id } })
    return { success: true }
  }

  // 按文档当前内容重新生成向量，适用于模型或向量数据需要刷新时。
  async revectorById(id: string): Promise<{ success: boolean }> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { content: true },
    })

    if (!document) {
      throw new Error('知识内容不存在')
    }

    const embedding = await this.embeddingService.createEmbedding(document.content)
    // 只刷新 embedding 字段，避免影响文档内容和元数据。
    await this.prisma.$executeRaw`
      UPDATE documents
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${id}
    `

    return { success: true }
  }
}
