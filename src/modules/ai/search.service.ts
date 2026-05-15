import { PrismaClient } from '@prisma/client'
import { createEmbedding } from './utils/embedding.js'

const prisma = new PrismaClient()

/**
 * 向量检索
 */
export async function searchSimilar(text, limit = 5) {
  // 1. 查询向量
  const embedding = await createEmbedding(text)

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
