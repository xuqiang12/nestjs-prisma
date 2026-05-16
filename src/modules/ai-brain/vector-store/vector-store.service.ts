/**
 * 向量存储服务 - 处理向量存储业务逻辑
 * 负责知识库的创建、分块、向量化和相似度搜索
 */
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { createEmbedding } from '../embedding/embedding.service'
import { splitText } from '../document/chunk.service'

const prisma = new PrismaClient()

@Injectable()
export class VectorStoreService {
  /**
   * 创建知识库 - 批量将文本分块、向量化并存储到数据库
   * @param content 文本内容
   * @param metadata 元数据信息
   */
  async createKnowledge(content, metadata = {}) {
    try {
      const chunks = splitText(content, { maxSize: 500, overlap: 100 })

      const insertPromises = chunks.map(async (chunk, i) => {
        try {
          const embedding = await createEmbedding(chunk)
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

      await Promise.allSettled(insertPromises)

      return {
        success: true,
        count: chunks.length,
      }
    } catch (error) {
      console.error('整体创建失败', error)
      throw new Error('知识库文本分块入库失败')
    }
  }

  /**
   * 搜索相似文档 - 基于文本查询最相似的文档
   * @param text 查询文本
   * @param limit 返回结果数量限制
   */
  async searchSimilar(text, limit = 5) {
    const embedding = await createEmbedding(text)

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
