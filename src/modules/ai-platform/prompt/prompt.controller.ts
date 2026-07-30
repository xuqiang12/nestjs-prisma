import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import {
  CreatePromptDto,
  DeletePromptDto,
  PromptDetailDto,
  PromptListDto,
  PromptStatusDto,
  UpdatePromptDto,
} from './dto/prompt.dto'
import { PromptService } from './prompt.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/prompt')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @ApiOperation({ summary: '查询提示词列表' })
  @Permissions('ai:prompt:list')
  @Get('list')
  list(@Query() query: PromptListDto) {
    return this.promptService.list(query)
  }

  @ApiOperation({ summary: '查询提示词详情' })
  @Permissions('ai:prompt:list')
  @Get('detail')
  detail(@Query() query: PromptDetailDto) {
    return this.promptService.detail(query.id)
  }

  @ApiOperation({ summary: '新增提示词' })
  @Permissions('ai:prompt:add')
  @Post()
  create(@Body() dto: CreatePromptDto) {
    return this.promptService.create(dto)
  }

  @ApiOperation({ summary: '修改提示词' })
  @Permissions('ai:prompt:update')
  @Post('update')
  update(@Body() dto: UpdatePromptDto) {
    return this.promptService.update(dto)
  }

  @ApiOperation({ summary: '修改提示词状态' })
  @Permissions('ai:prompt:status')
  @Post('status')
  updateStatus(@Body() dto: PromptStatusDto) {
    return this.promptService.updateStatus(dto)
  }

  @ApiOperation({ summary: '删除提示词' })
  @Permissions('ai:prompt:delete')
  @Post('delete')
  delete(@Body() dto: DeletePromptDto) {
    return this.promptService.delete(dto.id)
  }
}
