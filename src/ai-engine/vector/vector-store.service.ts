import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { EmbeddingConfig, EmbeddingService } from '../embedding/embedding.service'
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
  knowledgeBaseId?: string | null
  fileId?: string | null
  chunkIndex?: number | null
  tokenCount?: number | null
  charStart?: number | null
  charEnd?: number | null
  status?: number
  createdAt: Date
  updatedAt?: Date
}

type SearchOptions = {
  tags?: string[]
  knowledgeBaseIds?: string[]
  fileId?: string
  embeddingConfig?: EmbeddingConfig
}

type AddDocumentsOptions = {
  knowledgeBaseId?: string
  fileId?: string
  chunkSize?: number
  chunkOverlap?: number
  embeddingConfig?: EmbeddingConfig
}

@Injectable()
export class VectorStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // 将原始知识内容切片、生成向量，并逐条写入 pgvector 文档表。
  async addDocuments(
    contents: string[],
    metadata?: Record<string, any>,
    options: AddDocumentsOptions = {},
  ): Promise<AddDocumentsResult> {
    const chunks = contents.flatMap((content) => splitText(content, {
      maxSize: options.chunkSize,
      overlap: options.chunkOverlap,
    }))

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await this.embeddingService.createEmbedding(chunk, options.embeddingConfig)
      const sourceContent = contents[0] || chunk
      const charStart = Math.max(0, sourceContent.indexOf(chunk))
      const charEnd = charStart + chunk.length
      // 每个切片单独存储向量，chunkIndex 用来保留它在原始内容中的顺序。
      await this.prisma.$executeRaw`
        INSERT INTO documents (
          content,
          metadata,
          embedding,
          "knowledgeBaseId",
          "fileId",
          "chunkIndex",
          "tokenCount",
          "charStart",
          "charEnd",
          "status",
          "updatedAt"
        )
        VALUES (
          ${chunk},
          ${JSON.stringify({ ...metadata, chunkIndex: i })}::jsonb,
          ${JSON.stringify(embedding)}::vector,
          ${options.knowledgeBaseId || null},
          ${options.fileId || null},
          ${i},
          ${chunk.length},
          ${charStart},
          ${charEnd},
          1,
          CURRENT_TIMESTAMP
        )
      `
    }

    return { success: true, count: chunks.length }
  }

  // 根据查询文本生成向量，并按 pgvector 距离从近到远返回相似知识片段。
  async similaritySearch(query: string, limit = 5, options: SearchOptions = {}): Promise<SearchResult[]> {
    const embedding = await this.embeddingService.createEmbedding(query, options.embeddingConfig)
    const tags = Array.from(new Set((options.tags || []).map((tag) => tag.trim()).filter(Boolean)))
    const knowledgeBaseIds = Array.from(new Set((options.knowledgeBaseIds || []).map((id) => id.trim()).filter(Boolean)))
    if (tags.length || knowledgeBaseIds.length || options.fileId) {
      const scopedResult = await this.prisma.$queryRaw`
        SELECT
          id,
          content,
          metadata,
          "knowledgeBaseId",
          "fileId",
          "chunkIndex",
          embedding <=> ${JSON.stringify(embedding)}::vector AS distance
        FROM documents
        WHERE status = 1
          AND (${tags.length ? Prisma.sql`COALESCE(metadata->'tags', '[]'::jsonb) ?| ARRAY[${Prisma.join(tags)}]::text[]` : Prisma.sql`TRUE`})
          AND (${knowledgeBaseIds.length ? Prisma.sql`"knowledgeBaseId" = ANY(ARRAY[${Prisma.join(knowledgeBaseIds)}]::varchar[])` : Prisma.sql`TRUE`})
          AND (${options.fileId ? Prisma.sql`"fileId" = ${options.fileId}` : Prisma.sql`TRUE`})
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
        "knowledgeBaseId",
        "fileId",
        "chunkIndex",
        embedding <=> ${JSON.stringify(embedding)}::vector AS distance
      FROM documents
      WHERE status = 1
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    return result as SearchResult[]
  }

  // 分页查询知识文档列表，供知识库管理页面展示。
  async list(
    pageNum = 1,
    pageSize = 10,
    filters: { query?: string; knowledgeBaseId?: string; fileId?: string } = {},
  ): Promise<{ list: KnowledgeDocumentListItem[]; total: number }> {
    const skip = (pageNum - 1) * pageSize
    const where: Prisma.DocumentWhereInput = {
      ...(filters.query ? { content: { contains: filters.query, mode: 'insensitive' } } : {}),
      ...(filters.knowledgeBaseId ? { knowledgeBaseId: filters.knowledgeBaseId } : {}),
      ...(filters.fileId ? { fileId: filters.fileId } : {}),
    }
    const [list, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ chunkIndex: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          content: true,
          metadata: true,
          knowledgeBaseId: true,
          fileId: true,
          chunkIndex: true,
          tokenCount: true,
          charStart: true,
          charEnd: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.document.count({ where }),
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
      SET embedding = ${JSON.stringify(embedding)}::vector,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    return { success: true }
  }

  async updateContent(id: string, content: string): Promise<{ success: boolean }> {
    const embedding = await this.embeddingService.createEmbedding(content)
    await this.prisma.$executeRaw`
      UPDATE documents
      SET content = ${content},
          embedding = ${JSON.stringify(embedding)}::vector,
          "tokenCount" = ${content.length},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `
    return { success: true }
  }
}
