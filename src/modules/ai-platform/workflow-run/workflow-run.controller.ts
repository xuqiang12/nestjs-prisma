import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { WorkflowRunDetailDto, WorkflowRunListDto } from './dto/workflow-run.dto'
import { WorkflowRunService } from './workflow-run.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/workflow-run')
export class WorkflowRunController {
  constructor(private readonly workflowRunService: WorkflowRunService) {}

  @ApiOperation({ summary: '查询工作流运行记录列表' })
  @Permissions('ai:workflow-run:list')
  @Get('list')
  list(@Query() query: WorkflowRunListDto) {
    return this.workflowRunService.list(query)
  }

  @ApiOperation({ summary: '查询工作流运行记录详情' })
  @Permissions('ai:workflow-run:detail')
  @Get('detail')
  detail(@Query() query: WorkflowRunDetailDto) {
    return this.workflowRunService.detail(query.id)
  }
}
