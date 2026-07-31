import { Injectable } from '@nestjs/common'
import { VectorStoreService } from '../../../ai-engine/vector/vector-store.service'
import { KnowledgeListDto } from './dto/knowledge-list.dto'

@Injectable()
export class KnowledgeService {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  // 新增一段知识文本，并交给向量存储服务完成切片和入库。
  async createKnowledge(content: string, metadata?: Record<string, any>) {
    return this.vectorStoreService.addDocuments([content], metadata)
  }

  // 处理上传文件，把文件内容和文件名元数据写入知识库。
  async upload(file: Express.Multer.File, metadata?: string) {
    const content = file.buffer.toString('utf-8')
    const parsedMetadata = metadata ? JSON.parse(metadata) : undefined
    return this.vectorStoreService.addDocuments([content], {
      ...parsedMetadata,
      fileName: file.originalname,
    })
  }

  // 根据查询文本检索相似知识片段。
  async searchSimilar(query: string, limit?: number) {
    return this.vectorStoreService.similaritySearch(query, limit ? Number(limit) : undefined)
  }

  // 分页查询知识库文档列表。
  async list(query: KnowledgeListDto) {
    return this.vectorStoreService.list(Number(query.pageNum || 1), Number(query.pageSize || 10), {
      query: query.query,
    })
  }

  // 删除指定知识文档。
  async delete(id: string) {
    return this.vectorStoreService.deleteById(id)
  }

  // 重新生成指定知识文档的向量。
  async revector(id: string) {
    return this.vectorStoreService.revectorById(id)
  }
}
