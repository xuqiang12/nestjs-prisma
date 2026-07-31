import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

export type EmbeddingConfig = {
  endpoint?: string | null
  model?: string | null
  apiKeyRef?: string | null
}

@Injectable()
export class EmbeddingService {
  // 调用 Embedding 模型，把文本转换为可写入 pgvector 的向量数组。
  async createEmbedding(text: string, config?: EmbeddingConfig): Promise<number[]> {
    const apiKeyRef = config?.apiKeyRef || 'SILICONFLOW_API_KEY'
    const client = new OpenAI({
      apiKey: process.env[apiKeyRef] || process.env.SILICONFLOW_API_KEY,
      baseURL: config?.endpoint || process.env.SILICONFLOW_BASE_URL,
    })
    const res = await client.embeddings.create({
      model: config?.model || process.env.SILICONFLOW_EMBEDDING_MODEL || 'Alibaba-NLP/gte-Qwen2-7B-instruct',
      input: text,
    })

    return res.data[0].embedding
  }
}
