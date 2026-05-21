import { Injectable } from '@nestjs/common'
import { vectorStore } from '../../../ai-engine/infra/vector-store.provider'

@Injectable()
export class KnowledgeService {
  async createKnowledge(content: string, metadata?: Record<string, any>) {
    return vectorStore.addDocuments([content], metadata)
  }

  async searchSimilar(query: string, limit?: number) {
    return vectorStore.similaritySearch(query, limit)
  }
}
