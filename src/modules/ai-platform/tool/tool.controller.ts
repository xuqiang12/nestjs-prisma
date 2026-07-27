import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { ToolService } from './tool.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/tool')
export class ToolController {
  constructor(private readonly toolService: ToolService) {}

  @ApiOperation({ summary: '查询已注册工具列表' })
  @Permissions('ai:tool:list')
  @Get('list')
  list() {
    return this.toolService.list()
  }
}
