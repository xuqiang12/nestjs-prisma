import OpenAI from 'openai'
import { EmbeddingProvider } from './embedding.interface'

export class SiliconFlowEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI

  constructor() {
    console.log('[SiliconFlowEmbeddingProvider（embedding）] 构造函数-初始化...')
    this.client = new OpenAI({
      apiKey: process.env.SILICONFLOW_API_KEY,
      baseURL: process.env.SILICONFLOW_BASE_URL,
    })
    console.log('[SiliconFlowEmbeddingProvider（embedding）] 构造函数-初始化完成✅')
  }

  async createEmbedding(text: string): Promise<number[]> {
    console.log('[SiliconFlowEmbeddingProvider（createEmbedding）] 创建向量...')
    console.log('[SiliconFlowEmbeddingProvider（createEmbedding）] 文本长度:', text.length)

    try {
      const startTime = Date.now()
      const res = await this.client.embeddings.create({
        model: process.env.SILICONFLOW_EMBEDDING_MODEL || 'Alibaba-NLP/gte-Qwen2-7B-instruct',
        input: text,
      })

      const duration = Date.now() - startTime
      const embedding = res.data[0].embedding
      console.log('[SiliconFlowEmbeddingProvider（createEmbedding）] 向量创建完成，耗时:', duration, 'ms，维度:', embedding.length)

      return embedding
    } catch (error) {
      console.error('[SiliconFlowEmbeddingProvider（createEmbedding）] ❌ 创建向量失败:', error)
      throw error
    }
  }
}

export const embeddingProvider = new SiliconFlowEmbeddingProvider()
