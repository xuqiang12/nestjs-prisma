// 向量写入数据库服务
import { PrismaClient } from '@prisma/client'
import { createEmbedding } from './utils/embedding.js'

const prisma = new PrismaClient()

/**
 * 写入文档 + 向量
 */
export async function addDocument(content, metadata = {}) {
  // 1. 生成向量
  const embedding = await createEmbedding(content)

  // 2. 写入数据库
  const result = await prisma.$executeRaw`
    INSERT INTO documents (id, content, metadata, embedding)
    VALUES (
      gen_random_uuid(),
      ${content},
      ${metadata}::jsonb,
      ${JSON.stringify(embedding)}::vector
    )
  `

  return result
}
