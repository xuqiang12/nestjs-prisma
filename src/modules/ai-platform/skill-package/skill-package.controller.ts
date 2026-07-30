import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import {
  CreateSkillPackageDto,
  InstallSkillPackageDto,
  SkillPackageDetailDto,
  SkillPackageListDto,
  SkillPackageStatusDto,
  UpdateSkillPackageDto,
} from './dto/skill-package.dto'
import { SkillPackageService } from './skill-package.service'

@ApiTags('AI配置模块')
@ApiBearerAuth()
@Controller('ai-platform/skill-package')
export class SkillPackageController {
  constructor(private readonly skillPackageService: SkillPackageService) {}

  @ApiOperation({ summary: '查询技能包列表' })
  @Permissions('ai:skill-package:list')
  @Get('list')
  list(@Query() query: SkillPackageListDto) {
    return this.skillPackageService.list(query)
  }

  @ApiOperation({ summary: '查询技能包详情' })
  @Permissions('ai:skill-package:list')
  @Get('detail')
  detail(@Query() query: SkillPackageDetailDto) {
    return this.skillPackageService.detail(query.id)
  }

  @ApiOperation({ summary: '新增技能包' })
  @Permissions('ai:skill-package:add')
  @Post()
  create(@Body() dto: CreateSkillPackageDto) {
    return this.skillPackageService.create(dto)
  }

  @ApiOperation({ summary: '修改技能包' })
  @Permissions('ai:skill-package:update')
  @Post('update')
  update(@Body() dto: UpdateSkillPackageDto) {
    return this.skillPackageService.update(dto)
  }

  @ApiOperation({ summary: '修改技能包状态' })
  @Permissions('ai:skill-package:status')
  @Post('status')
  updateStatus(@Body() dto: SkillPackageStatusDto) {
    return this.skillPackageService.updateStatus(dto)
  }

  @ApiOperation({ summary: '安装技能包到智能体' })
  @Permissions('ai:skill-package:install')
  @Post('install-to-agent')
  installToAgent(@Body() dto: InstallSkillPackageDto) {
    return this.skillPackageService.installToAgent(dto)
  }
}
