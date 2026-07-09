import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class EmbeddingService {
  private readonly client = new OpenAI({
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseURL: process.env.SILICONFLOW_BASE_URL,
  })

  async createEmbedding(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: process.env.SILICONFLOW_EMBEDDING_MODEL || 'Alibaba-NLP/gte-Qwen2-7B-instruct',
      input: text,
    })

    return res.data[0].embedding
  }
}
