import { PrismaClient } from '@prisma/client'
import { createEmbedding } from './utils/embedding.js'
import { splitText } from './utils/chunk.js'

const prisma = new PrismaClient()

export async function insertDocument(content, metadata = {}) {
  // 1️⃣ 分块
  const chunks = splitText(content, 500)

  console.log(`总共分成 ${chunks.length} 块`)

  // 2️⃣ 循环写入
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    // 生成向量
    const embedding = await createEmbedding(chunk)

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
  }

  return {
    success: true,
    chunks: chunks.length,
  }
}
