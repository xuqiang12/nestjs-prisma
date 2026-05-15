import { PrismaClient } from '@prisma/client'
import { EmbeddingService } from '../utils/embedding.js'
import { splitText } from '../utils/chunk.js'

const prisma = new PrismaClient()
export class ChatService {
  // 创建知识库
  async createKnowledge(content, metadata = {}) {
    // 1️⃣ 分块
    const chunks = splitText(content, 500)

    console.log(`总共分成 ${chunks.length} 块`)

    // 2️⃣ 循环写入
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // 生成向量
      const embedding = await EmbeddingService(chunk)
      try {
        // 写入数据库
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
        console.log(`第 ${i} 块写入成功`)
      } catch (error) {
        console.log(`第 ${i} 块写入失败:`, error)
      }
    }

    return 1
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
