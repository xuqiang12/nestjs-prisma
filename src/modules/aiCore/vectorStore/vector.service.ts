import { PrismaClient } from '@prisma/client'
import { EmbeddingService } from '../utils/embedding.js'
import { splitText } from '../utils/chunk.js'

const prisma = new PrismaClient()
export class VectorService {
  // 创建知识库
  async createKnowledge(content, metadata = {}) {
    try {
      // 1. 分块
      const chunks = splitText(content, 500)
      // 2. 批量插入（关键：不要循环插入！）
      const insertPromises = chunks.map(async (chunk, i) => {
        try {
          const embedding = await EmbeddingService(chunk)
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
        } catch (e) {
          console.error(`第 ${i} 块失败`, e)
        }
      })
      // 3. 等待所有完成（不会阻塞！不会卡死！）
      await Promise.allSettled(insertPromises)

      // 4. 正常返回 → 前端结束加载
      return {
        success: true,
        count: chunks.length,
      }
    } catch (error) {
      console.error('整体创建失败', error)
      // 必须抛出 or 返回错误，前端才会结束加载
      throw new Error('知识库文本分块入库失败')
    }
  }

  // 搜索相似文档
  async searchSimilar(text, limit = 5) {
    // 1. 查询向量
    const embedding = await EmbeddingService(text)

    // 2. 相似度查询（核心）
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
    return result
  }
}
