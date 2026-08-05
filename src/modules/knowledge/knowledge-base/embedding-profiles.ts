export type EmbeddingProfile = {
  code: string
  name: string
  provider: string
  endpoint: string
  model: string
  dimension: number
  apiKeyMode: 'env'
  apiKeyRef: string
}

export const EMBEDDING_PROFILES: EmbeddingProfile[] = [
  {
    code: 'siliconflow-default',
    name: 'SiliconFlow 默认向量',
    provider: 'siliconflow',
    endpoint: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
    model: process.env.SILICONFLOW_EMBEDDING_MODEL || 'Alibaba-NLP/gte-Qwen2-7B-instruct',
    dimension: 1024,
    apiKeyMode: 'env',
    apiKeyRef: 'SILICONFLOW_API_KEY',
  },
]

export function getEmbeddingProfile(code?: string) {
  return EMBEDDING_PROFILES.find((item) => item.code === code) || EMBEDDING_PROFILES[0]
}
