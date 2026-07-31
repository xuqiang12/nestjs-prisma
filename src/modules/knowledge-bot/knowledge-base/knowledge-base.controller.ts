import { Body, Controller, Get, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import {
  CreateKnowledgeBaseDto,
  KnowledgeBaseFileActionDto,
  KnowledgeBaseIdDto,
  KnowledgeBaseListDto,
  KnowledgeBaseStatusDto,
  KnowledgeChunkIdDto,
  KnowledgeChunkListDto,
  KnowledgeFileIdDto,
  KnowledgeFileListDto,
  KnowledgeSearchTestDto,
  UpdateKnowledgeBaseDto,
  UpdateKnowledgeChunkDto,
} from './dto/knowledge-base.dto'
import { KnowledgeBaseService } from './knowledge-base.service'

@ApiTags('知识库高级管理')
@Controller('knowledge-bot/knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @ApiOperation({ summary: '知识库列表' })
  @Permissions('ai:knowledge:list')
  @Get('list')
  async list(@Query() query: KnowledgeBaseListDto) {
    return this.knowledgeBaseService.list(query)
  }

  @ApiOperation({ summary: '知识库配置选项' })
  @Permissions('ai:knowledge:list')
  @Get('options')
  async options() {
    return {
      embeddingProfiles: await this.knowledgeBaseService.embeddingProfiles(),
      knowledgeBases: await this.knowledgeBaseService.enabledOptions(),
    }
  }

  @ApiOperation({ summary: '知识库详情' })
  @Permissions('ai:knowledge:list')
  @Get('detail')
  async detail(@Query() query: KnowledgeBaseIdDto) {
    return this.knowledgeBaseService.detail(query.id)
  }

  @ApiOperation({ summary: '创建知识库' })
  @ApiBody({ type: CreateKnowledgeBaseDto })
  @Permissions('ai:knowledge:upload')
  @Post()
  async create(@Body() body: CreateKnowledgeBaseDto) {
    return this.knowledgeBaseService.create(body)
  }

  @ApiOperation({ summary: '编辑知识库' })
  @ApiBody({ type: UpdateKnowledgeBaseDto })
  @Permissions('ai:knowledge:upload')
  @Post('update')
  async update(@Body() body: UpdateKnowledgeBaseDto) {
    return this.knowledgeBaseService.update(body)
  }

  @ApiOperation({ summary: '启用或禁用知识库' })
  @ApiBody({ type: KnowledgeBaseStatusDto })
  @Permissions('ai:knowledge:upload')
  @Post('status')
  async status(@Body() body: KnowledgeBaseStatusDto) {
    return this.knowledgeBaseService.updateStatus(body.id, body.status)
  }

  @ApiOperation({ summary: '删除知识库' })
  @ApiBody({ type: KnowledgeBaseIdDto })
  @Permissions('ai:knowledge:delete')
  @Post('delete')
  async delete(@Body() body: KnowledgeBaseIdDto) {
    return this.knowledgeBaseService.delete(body.id)
  }

  @ApiOperation({ summary: '文件列表' })
  @Permissions('ai:knowledge:list')
  @Get('file/list')
  async fileList(@Query() query: KnowledgeFileListDto) {
    return this.knowledgeBaseService.fileList(query)
  }

  @ApiOperation({ summary: '上传知识库文件' })
  @ApiConsumes('multipart/form-data')
  @Permissions('ai:knowledge:upload')
  @Post('file/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Body('knowledgeBaseId') knowledgeBaseId: string, @UploadedFile() file: Express.Multer.File) {
    return this.knowledgeBaseService.uploadFile(knowledgeBaseId, file)
  }

  @ApiOperation({ summary: '下载源文件' })
  @Permissions('ai:knowledge:list')
  @Get('file/download')
  async downloadFile(@Query() query: KnowledgeFileIdDto, @Res() response: Response) {
    const file = await this.knowledgeBaseService.downloadFile(query.fileId)
    return response.download(file.absolutePath, file.originalName)
  }

  @ApiOperation({ summary: '重新上传并替换源文件' })
  @ApiConsumes('multipart/form-data')
  @Permissions('ai:knowledge:upload')
  @Post('file/replace')
  @UseInterceptors(FileInterceptor('file'))
  async replaceFile(
    @Body('knowledgeBaseId') knowledgeBaseId: string,
    @Body('fileId') fileId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.knowledgeBaseService.replaceFile(knowledgeBaseId, fileId, file)
  }

  @ApiOperation({ summary: '单个文件重新分片' })
  @ApiBody({ type: KnowledgeBaseFileActionDto })
  @Permissions('ai:knowledge:revector')
  @Post('file/rechunk')
  async rechunkFile(@Body() body: KnowledgeBaseFileActionDto) {
    return this.knowledgeBaseService.rechunkFile(body.knowledgeBaseId, body.fileId)
  }

  @ApiOperation({ summary: '当前知识库全部重新分片' })
  @ApiBody({ type: KnowledgeBaseIdDto })
  @Permissions('ai:knowledge:revector')
  @Post('file/rechunk-all')
  async rechunkAll(@Body() body: KnowledgeBaseIdDto) {
    return this.knowledgeBaseService.rechunkAll(body.id)
  }

  @ApiOperation({ summary: '删除文件及分片' })
  @ApiBody({ type: KnowledgeBaseFileActionDto })
  @Permissions('ai:knowledge:delete')
  @Post('file/delete')
  async deleteFile(@Body() body: KnowledgeBaseFileActionDto) {
    return this.knowledgeBaseService.deleteFile(body.knowledgeBaseId, body.fileId)
  }

  @ApiOperation({ summary: '分片列表' })
  @Permissions('ai:knowledge:list')
  @Get('chunk/list')
  async chunkList(@Query() query: KnowledgeChunkListDto) {
    return this.knowledgeBaseService.chunkList(query)
  }

  @ApiOperation({ summary: '分片详情' })
  @Permissions('ai:knowledge:list')
  @Get('chunk/detail')
  async chunkDetail(@Query() query: KnowledgeChunkIdDto) {
    return this.knowledgeBaseService.chunkDetail(query.id)
  }

  @ApiOperation({ summary: '编辑分片并重建向量' })
  @ApiBody({ type: UpdateKnowledgeChunkDto })
  @Permissions('ai:knowledge:revector')
  @Post('chunk/update')
  async updateChunk(@Body() body: UpdateKnowledgeChunkDto) {
    return this.knowledgeBaseService.updateChunk(body.id, body.content)
  }

  @ApiOperation({ summary: '删除分片' })
  @ApiBody({ type: KnowledgeChunkIdDto })
  @Permissions('ai:knowledge:delete')
  @Post('chunk/delete')
  async deleteChunk(@Body() body: KnowledgeChunkIdDto) {
    return this.knowledgeBaseService.deleteChunk(body.id)
  }

  @ApiOperation({ summary: '按当前知识库范围检索测试' })
  @Permissions('ai:knowledge:search')
  @Get('search-test')
  async searchTest(@Query() query: KnowledgeSearchTestDto) {
    return this.knowledgeBaseService.searchTest(query)
  }
}
