export interface EmbeddingProvider {
  createEmbedding(text: string): Promise<number[]>
}
