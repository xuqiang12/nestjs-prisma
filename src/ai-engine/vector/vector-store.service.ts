import { Injectable } from '@nestjs/common'
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

@Injectable()
export class VectorStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async addDocuments(contents: string[], metadata?: Record<string, any>): Promise<AddDocumentsResult> {
    const chunks = contents.flatMap((content) => splitText(content))

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await this.embeddingService.createEmbedding(chunk)
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

  async similaritySearch(query: string, limit = 5): Promise<SearchResult[]> {
    const embedding = await this.embeddingService.createEmbedding(query)
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

  async deleteById(id: string): Promise<{ success: boolean }> {
    await this.prisma.document.delete({ where: { id } })
    return { success: true }
  }

  async revectorById(id: string): Promise<{ success: boolean }> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { content: true },
    })

    if (!document) {
      throw new Error('知识内容不存在')
    }

    const embedding = await this.embeddingService.createEmbedding(document.content)
    await this.prisma.$executeRaw`
      UPDATE documents
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${id}
    `

    return { success: true }
  }
}
