import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { ModelProviderListDto } from './model-provider.dto'
import { ModelProviderService } from './model-provider.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/model-provider')
export class ModelProviderController {
  constructor(private readonly modelProviderService: ModelProviderService) {}

  @ApiOperation({ summary: '查询模型供应商列表' })
  @Permissions('ai:model:list')
  @Get('list')
  list(@Query() query: ModelProviderListDto) {
    return this.modelProviderService.list(query)
  }

  @ApiOperation({ summary: '查询可用模型供应商选项' })
  @Permissions('ai:model:list')
  @Get('options')
  options() {
    return this.modelProviderService.options()
  }
}
