import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { CreateModelConfigDto, ModelConfigListDto, ModelConfigStatusDto, UpdateModelConfigDto } from './dto/model-config.dto'
import { ModelConfigService } from './model-config.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/model')
export class ModelConfigController {
  constructor(private readonly modelConfigService: ModelConfigService) {}

  @ApiOperation({ summary: '查询模型配置列表' })
  @Permissions('ai:model:list')
  @Get('list')
  list(@Query() query: ModelConfigListDto) {
    return this.modelConfigService.list(query)
  }

  @ApiOperation({ summary: '查询可用模型配置选项' })
  @Permissions('ai:model:list')
  @Get('options')
  options() {
    return this.modelConfigService.options()
  }

  @ApiOperation({ summary: '新增模型配置' })
  @Permissions('ai:model:add')
  @Post('create')
  create(@Body() dto: CreateModelConfigDto) {
    return this.modelConfigService.create(dto)
  }

  @ApiOperation({ summary: '修改模型配置' })
  @Permissions('ai:model:update')
  @Post('update')
  update(@Body() dto: UpdateModelConfigDto) {
    return this.modelConfigService.update(dto)
  }

  @ApiOperation({ summary: '修改模型配置状态' })
  @Permissions('ai:model:status')
  @Post('status')
  updateStatus(@Body() dto: ModelConfigStatusDto) {
    return this.modelConfigService.updateStatus(dto)
  }
}
