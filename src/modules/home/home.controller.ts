import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { SaveHomeComponentsDto } from './dto/component.dto'
import {
  CreateHomeDecorationDto,
  UpdateHomeDecorationDto,
  UpdateHomeDecorationStatusDto,
} from './dto/decoration.dto'
import {
  HomeComponentListQueryDto,
  HomeContentDetailQueryDto,
  HomeDecorationDetailQueryDto,
  HomeDecorationListQueryDto,
} from './dto/query.dto'
import { HomeService } from './home.service'

@ApiTags('首页配置模块')
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Public()
  @ApiOperation({ summary: '获取首页主配置' })
  @Get('config')
  getHomeConfig() {
    return this.homeService.getHomeConfig()
  }

  @Public()
  @ApiOperation({ summary: '获取频道或联动内容详情' })
  @Get('content-detail')
  getContentDetail(@Query() query: HomeContentDetailQueryDto) {
    return this.homeService.getContentDetail(query.id)
  }

  @ApiOperation({ summary: '查询首页配置列表' })
  @Get('decorations/list')
  listDecorations(@Query() query: HomeDecorationListQueryDto) {
    return this.homeService.listDecorations(query)
  }

  @ApiOperation({ summary: '查询首页配置详情' })
  @Get('decorations/detail')
  getDecorationDetail(@Query() query: HomeDecorationDetailQueryDto) {
    return this.homeService.getDecorationDetail(query.id)
  }

  @ApiOperation({ summary: '新增首页配置' })
  @Post('decorations/create')
  createDecoration(@Body() dto: CreateHomeDecorationDto) {
    return this.homeService.createDecoration(dto)
  }

  @ApiOperation({ summary: '修改首页配置' })
  @Post('decorations/update')
  updateDecoration(@Body() dto: UpdateHomeDecorationDto) {
    return this.homeService.updateDecoration(dto)
  }

  @ApiOperation({ summary: '修改首页配置状态' })
  @Post('decorations/status')
  updateDecorationStatus(@Body() dto: UpdateHomeDecorationStatusDto) {
    return this.homeService.updateDecorationStatus(dto)
  }

  @ApiOperation({ summary: '查询首页组件列表' })
  @Get('components/list')
  listComponents(@Query() query: HomeComponentListQueryDto) {
    return this.homeService.listComponents(query.decorationId)
  }

  @ApiOperation({ summary: '保存首页装修组件列表' })
  @Post('decorations/save-components')
  saveComponents(@Body() dto: SaveHomeComponentsDto) {
    return this.homeService.saveComponents(dto)
  }
}
