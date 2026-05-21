import { PrismaClient } from '@prisma/client'
import { VectorStore, SearchResult } from './vector-store.interface'
import { embeddingProvider } from '../models/embedding.provider'
import { splitText } from './text-chunker'

const prisma = new PrismaClient()

export class PrismaVectorStore implements VectorStore {
  constructor() {
    console.log('[PrismaVectorStore（vector-store）] 构造函数-初始化完成✅')
  }

  async addDocuments(
    contents: string[],
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; count: number }> {
    console.log('───────────────────────────────────────────────────────────')
    console.log('[PrismaVectorStore（addDocuments）] 开始添加文档...')
    console.log('[PrismaVectorStore（addDocuments）] 文档数量:', contents.length)
    console.log('───────────────────────────────────────────────────────────')

    try {
      const allChunks: string[] = []

      for (let i = 0; i < contents.length; i++) {
        const content = contents[i]
        console.log(`[PrismaVectorStore（addDocuments）] 处理文档${i + 1}，长度:`, content.length)
        const chunks = splitText(content)
        console.log(`[PrismaVectorStore（addDocuments）] 文档${i + 1}切分为`, chunks.length, '个 chunks')
        allChunks.push(...chunks)
      }

      console.log('[PrismaVectorStore（addDocuments）] 总 chunks 数量:', allChunks.length)

      console.log('[PrismaVectorStore（addDocuments）] 开始向量化和入库...')
      const insertPromises = allChunks.map(async (chunk, i) => {
        try {
          console.log(`[PrismaVectorStore（addDocuments）] 处理 chunk${i + 1}/${allChunks.length}...`)
          const embedding = await embeddingProvider.createEmbedding(chunk)
          console.log(`[PrismaVectorStore（addDocuments）] chunk${i + 1}向量化完成，维度:`, embedding.length)
          await prisma.$executeRaw`
          INSERT INTO documents (id, content, metadata, embedding)
          VALUES (
            gen_random_uuid(),
            ${chunk},
            ${JSON.stringify({
              ...metadata,
              chunkIndex: i,
            })}::jsonb,
            ${JSON.stringify(embedding)}::vector
          )
        `
          console.log(`[PrismaVectorStore（addDocuments）] chunk${i + 1}入库成功✅`)
        } catch (e) {
          console.error(`[PrismaVectorStore（addDocuments）] ❌ chunk${i + 1}失败:`, e)
        }
      })

      console.log('[PrismaVectorStore（addDocuments）] 等待所有插入完成...')
      await Promise.allSettled(insertPromises)

      console.log('───────────────────────────────────────────────────────────')
      console.log('[PrismaVectorStore（addDocuments）] 完成！成功添加', allChunks.length, '个 chunks ✅')
      console.log('───────────────────────────────────────────────────────────')

      return {
        success: true,
        count: allChunks.length,
      }
    } catch (error) {
      console.error('[PrismaVectorStore（addDocuments）] ❌ 添加文档失败:', error)
      throw new Error('知识库文本分块入库失败')
    }
  }

  async similaritySearch(query: string, limit = 5): Promise<SearchResult[]> {
    console.log('[PrismaVectorStore（similaritySearch）] 开始相似度搜索...')
    console.log('[PrismaVectorStore（similaritySearch）] 查询:', query, '限制:', limit)

    console.log('[PrismaVectorStore（similaritySearch）] 创建查询向量...')
    const embedding = await embeddingProvider.createEmbedding(query)
    console.log('[PrismaVectorStore（similaritySearch）] 向量创建完成，维度:', embedding.length)

    console.log('[PrismaVectorStore（similaritySearch）] 执行数据库搜索...')
    const result = await prisma.$queryRaw`
      SELECT
        id,
        content,
        metadata,
        embedding <=> ${JSON.stringify(embedding)}::vector AS distance
      FROM documents
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    const results = result as SearchResult[]
    console.log('[PrismaVectorStore（similaritySearch）] 搜索完成，找到', results.length, '个结果')

    return results
  }
}

export const vectorStore = new PrismaVectorStore()
