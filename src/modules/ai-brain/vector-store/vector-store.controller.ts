/**
 * 向量存储控制器 - 处理向量存储相关 HTTP 请求
 * 提供知识库创建和相似文档搜索接口
 */
import { Body, Controller, Post } from '@nestjs/common'
import { VectorStoreService } from './vector-store.service'
import { readFileContent } from '../document/file-reader.service'
import { Public } from 'src/common/decorators/public.decorator'

@Controller('ai-brain/knowledge')
export class VectorStoreController {
  constructor(private readonly vector: VectorStoreService) {}

  @Public()
  @Post('ingest')
  async knowledgeIngest() {
    const content = await readFileContent('src/modules/aiCore/prompt/test.txt')
    return this.vector.createKnowledge(content, {
      source: 'test',
    })
  }

  @Public()
  @Post('search')
  async knowledgeSimilarSearch(@Body() body: { message: string }) {
    return this.vector.searchSimilar(body.message, 5)
  }
}
