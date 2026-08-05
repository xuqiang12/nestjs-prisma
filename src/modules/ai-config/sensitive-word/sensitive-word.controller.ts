import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import {
  CreateSensitiveWordDto,
  SensitiveWordDetailDto,
  SensitiveWordListDto,
  SensitiveWordStatusDto,
  UpdateSensitiveWordDto,
} from './dto/sensitive-word.dto'
import { SensitiveWordService } from './sensitive-word.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-config/sensitive-word')
export class SensitiveWordController {
  constructor(private readonly sensitiveWordService: SensitiveWordService) {}

  @ApiOperation({ summary: '查询敏感词列表' })
  @Permissions('ai:sensitive-word:list')
  @Get('list')
  list(@Query() query: SensitiveWordListDto) {
    return this.sensitiveWordService.list(query)
  }

  @ApiOperation({ summary: '查询敏感词详情' })
  @Permissions('ai:sensitive-word:list')
  @Get('detail')
  detail(@Query() query: SensitiveWordDetailDto) {
    return this.sensitiveWordService.detail(query.id)
  }

  @ApiOperation({ summary: '新增敏感词' })
  @Permissions('ai:sensitive-word:add')
  @Post()
  create(@Body() dto: CreateSensitiveWordDto) {
    return this.sensitiveWordService.create(dto)
  }

  @ApiOperation({ summary: '修改敏感词' })
  @Permissions('ai:sensitive-word:update')
  @Post('update')
  update(@Body() dto: UpdateSensitiveWordDto) {
    return this.sensitiveWordService.update(dto)
  }

  @ApiOperation({ summary: '修改敏感词状态' })
  @Permissions('ai:sensitive-word:status')
  @Post('status')
  updateStatus(@Body() dto: SensitiveWordStatusDto) {
    return this.sensitiveWordService.updateStatus(dto)
  }
}
