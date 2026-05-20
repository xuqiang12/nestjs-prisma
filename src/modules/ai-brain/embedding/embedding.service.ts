/**
 * 向量嵌入服务 - 将文本转换为向量表示
 * 使用 SiliconFlow 的 Qwen3-VL-Embedding-8B 模型
 */

import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: process.env.SILICONFLOW_BASE_URL,
})

export async function createEmbedding(text: string) {
  try {
    const res = await client.embeddings.create({
      model: process.env.SILICONFLOW_EMBEDDING_MODEL,
      input: text,
    })

    return res.data[0].embedding
  } catch (error) {
    console.error('embedding error:', error)
    return null
  }
}
