import { Controller, Post, Body, Get, Query } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { KnowledgeService } from './knowledge.service'
import { Public } from '../../../common/decorators/public.decorator'

@ApiTags('知识库模块')
@Controller('knowledge-bot/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Public()
  @ApiOperation({ summary: '新增知识内容' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', description: '知识内容' },
        metadata: { type: 'object', description: '知识元数据' },
      },
    },
  })
  @Post()
  async createKnowledge(@Body() body: { content: string; metadata?: Record<string, any> }) {
    return this.knowledgeService.createKnowledge(body.content, body.metadata)
  }

  @Public()
  @ApiOperation({ summary: '检索相似知识' })
  @ApiQuery({ name: 'query', description: '检索关键词' })
  @ApiQuery({ name: 'limit', description: '返回数量', required: false })
  @Get('search')
  async searchSimilar(@Query('query') query: string, @Query('limit') limit?: string) {
    return this.knowledgeService.searchSimilar(query, limit ? parseInt(limit) : undefined)
  }
}
