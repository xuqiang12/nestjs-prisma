import { Controller, Post, Body, Get, Query } from '@nestjs/common'
import { KnowledgeService } from './knowledge.service'
import { Public } from '../../../common/decorators/public.decorator'

@Controller('knowledge-bot/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Public()
  @Post()
  async createKnowledge(@Body() body: { content: string; metadata?: Record<string, any> }) {
    return this.knowledgeService.createKnowledge(body.content, body.metadata)
  }

  @Public()
  @Get('search')
  async searchSimilar(@Query('query') query: string, @Query('limit') limit?: string) {
    return this.knowledgeService.searchSimilar(query, limit ? parseInt(limit) : undefined)
  }
}
