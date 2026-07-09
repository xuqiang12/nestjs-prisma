import { Controller, Post, Body, Get, Query, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { KnowledgeService } from './knowledge.service'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { CreateKnowledgeDto } from './dto/create-knowledge.dto'
import { DeleteKnowledgeDto } from './dto/delete-knowledge.dto'
import { KnowledgeListDto } from './dto/knowledge-list.dto'
import { RevectorKnowledgeDto } from './dto/revector-knowledge.dto'
import { SearchKnowledgeDto } from './dto/search-knowledge.dto'

@ApiTags('知识库模块')
@Controller('knowledge-bot/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @ApiOperation({ summary: '新增知识内容' })
  @ApiBody({ type: CreateKnowledgeDto })
  @Permissions('ai:knowledge:upload')
  @Post()
  async createKnowledge(@Body() body: CreateKnowledgeDto) {
    return this.knowledgeService.createKnowledge(body.content, body.metadata)
  }

  @ApiOperation({ summary: '上传知识文件' })
  @Permissions('ai:knowledge:upload')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body('metadata') metadata?: string) {
    return this.knowledgeService.upload(file, metadata)
  }

  @ApiOperation({ summary: '查询知识列表' })
  @Permissions('ai:knowledge:list')
  @Get('list')
  async list(@Query() query: KnowledgeListDto) {
    return this.knowledgeService.list(query)
  }

  @ApiOperation({ summary: '删除知识内容' })
  @ApiBody({ type: DeleteKnowledgeDto })
  @Permissions('ai:knowledge:delete')
  @Post('delete')
  async delete(@Body() body: DeleteKnowledgeDto) {
    return this.knowledgeService.delete(body.id)
  }

  @ApiOperation({ summary: '重新向量化知识内容' })
  @ApiBody({ type: RevectorKnowledgeDto })
  @Permissions('ai:knowledge:revector')
  @Post('revector')
  async revector(@Body() body: RevectorKnowledgeDto) {
    return this.knowledgeService.revector(body.id)
  }

  @ApiOperation({ summary: '检索相似知识' })
  @ApiQuery({ name: 'query', description: '检索关键词' })
  @ApiQuery({ name: 'limit', description: '返回数量', required: false })
  @Permissions('ai:knowledge:search')
  @Get('search')
  async searchSimilar(@Query() query: SearchKnowledgeDto) {
    return this.knowledgeService.searchSimilar(query.query, query.limit)
  }
}
