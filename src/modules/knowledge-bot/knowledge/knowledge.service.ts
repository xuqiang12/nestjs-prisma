import { Injectable } from '@nestjs/common'
import { VectorStoreService } from '../../../ai-engine/vector/vector-store.service'
import { KnowledgeListDto } from './dto/knowledge-list.dto'

@Injectable()
export class KnowledgeService {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  async createKnowledge(content: string, metadata?: Record<string, any>) {
    return this.vectorStoreService.addDocuments([content], metadata)
  }

  async upload(file: Express.Multer.File, metadata?: string) {
    const content = file.buffer.toString('utf-8')
    const parsedMetadata = metadata ? JSON.parse(metadata) : undefined
    return this.vectorStoreService.addDocuments([content], {
      ...parsedMetadata,
      fileName: file.originalname,
    })
  }

  async searchSimilar(query: string, limit?: number) {
    return this.vectorStoreService.similaritySearch(query, limit ? Number(limit) : undefined)
  }

  async list(query: KnowledgeListDto) {
    return this.vectorStoreService.list(Number(query.pageNum || 1), Number(query.pageSize || 10))
  }

  async delete(id: string) {
    return this.vectorStoreService.deleteById(id)
  }

  async revector(id: string) {
    return this.vectorStoreService.revectorById(id)
  }
}
