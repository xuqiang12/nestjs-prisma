import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import {
  CreateWorkflowDto,
  SaveWorkflowGraphDto,
  TestRunWorkflowDto,
  UpdateWorkflowDto,
  ValidateWorkflowGraphDto,
  WorkflowDetailDto,
  WorkflowListDto,
  WorkflowStatusDto,
} from './dto/workflow.dto'
import { WorkflowService } from './workflow.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @ApiOperation({ summary: '查询工作流列表' })
  @Permissions('ai:workflow:list')
  @Get('list')
  list(@Query() query: WorkflowListDto) {
    return this.workflowService.list(query)
  }

  @ApiOperation({ summary: '查询工作流详情' })
  @Permissions('ai:workflow:list')
  @Get('detail')
  detail(@Query() query: WorkflowDetailDto) {
    return this.workflowService.detail(query.id)
  }

  @ApiOperation({ summary: '新增工作流' })
  @Permissions('ai:workflow:add')
  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(dto)
  }

  @ApiOperation({ summary: '修改工作流' })
  @Permissions('ai:workflow:update')
  @Post('update')
  update(@Body() dto: UpdateWorkflowDto) {
    return this.workflowService.update(dto)
  }

  @ApiOperation({ summary: '修改工作流状态' })
  @Permissions('ai:workflow:status')
  @Post('status')
  updateStatus(@Body() dto: WorkflowStatusDto) {
    return this.workflowService.updateStatus(dto)
  }

  @ApiOperation({ summary: '保存工作流图' })
  @Permissions('ai:workflow:update')
  @Post('save-graph')
  saveGraph(@Body() dto: SaveWorkflowGraphDto) {
    return this.workflowService.saveGraph(dto)
  }

  @ApiOperation({ summary: '校验工作流图' })
  @Permissions('ai:workflow:update')
  @Post('validate')
  validate(@Body() dto: ValidateWorkflowGraphDto) {
    return this.workflowService.validate(dto)
  }

  @ApiOperation({ summary: '测试运行工作流' })
  @Permissions('ai:workflow:test')
  @Post('test-run')
  testRun(@Body() dto: TestRunWorkflowDto) {
    return this.workflowService.testRun(dto)
  }
}
