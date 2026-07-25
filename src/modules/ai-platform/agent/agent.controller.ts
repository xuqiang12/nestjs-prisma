import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { AgentDetailDto, AgentListDto, AgentStatusDto, CreateAgentDto, UpdateAgentDto } from './dto/agent.dto'
import { AgentService } from './agent.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @ApiOperation({ summary: '查询智能体列表' })
  @Permissions('ai:agent:list')
  @Get('list')
  list(@Query() query: AgentListDto) {
    return this.agentService.list(query)
  }

  @ApiOperation({ summary: '查询智能体详情' })
  @Permissions('ai:agent:list')
  @Get('detail')
  detail(@Query() query: AgentDetailDto) {
    return this.agentService.detail(query.id)
  }

  @ApiOperation({ summary: '查询可用智能体选项' })
  @Permissions('ai:agent:list')
  @Get('enabled-options')
  enabledOptions() {
    return this.agentService.enabledOptions()
  }

  @ApiOperation({ summary: '新增智能体' })
  @Permissions('ai:agent:add')
  @Post()
  create(@Body() dto: CreateAgentDto) {
    return this.agentService.create(dto)
  }

  @ApiOperation({ summary: '修改智能体' })
  @Permissions('ai:agent:update')
  @Post('update')
  update(@Body() dto: UpdateAgentDto) {
    return this.agentService.update(dto)
  }

  @ApiOperation({ summary: '修改智能体状态' })
  @Permissions('ai:agent:status')
  @Post('status')
  updateStatus(@Body() dto: AgentStatusDto) {
    return this.agentService.updateStatus(dto)
  }
}
