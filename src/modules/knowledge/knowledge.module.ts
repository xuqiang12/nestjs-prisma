import { Module } from '@nestjs/common'
import { KnowledgeBaseController } from './knowledge-base/knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base/knowledge-base.service'
import { KnowledgeStorageService } from './knowledge-base/knowledge-storage.service'

@Module({
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, KnowledgeStorageService],
})
export class KnowledgeModule {}
