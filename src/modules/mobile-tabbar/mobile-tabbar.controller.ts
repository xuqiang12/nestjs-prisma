// 这个文件提供小程序底部导航运行时读取和后台管理接口。
import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import {
  MobileTabBarDetailQueryDto,
  SaveMobileTabBarConfigDto,
  UpdateMobileTabBarStatusDto,
} from './dto/mobile-tabbar.dto'
import { MobileTabBarService } from './mobile-tabbar.service'

@ApiTags('小程序底部导航')
@ApiBearerAuth()
@Controller('mobile')
export class MobileTabBarRuntimeController {
  constructor(private readonly mobileTabBarService: MobileTabBarService) {}

  // 获取小程序当前启用的底部导航配置。
  @Public()
  @ApiOperation({ summary: '获取小程序当前底部导航配置' })
  @Get('tabbar')
  getCurrentTabBar() {
    return this.mobileTabBarService.getConfig()
  }
}

@ApiTags('小程序底部导航')
@ApiBearerAuth()
@Controller('mobile-tabbar')
export class MobileTabBarController {
  constructor(private readonly mobileTabBarService: MobileTabBarService) {}

  // 获取后台当前启用的底部导航配置。
  @Public()
  @ApiOperation({ summary: '获取小程序底部导航配置' })
  @Get('config')
  getConfig() {
    return this.mobileTabBarService.getConfig()
  }

  // 查询后台底部导航配置列表。
  @ApiOperation({ summary: '获取小程序底部导航配置列表' })
  @Get('list')
  listConfigs() {
    return this.mobileTabBarService.listConfigs()
  }

  // 查询后台底部导航配置详情。
  @ApiOperation({ summary: '获取小程序底部导航配置详情' })
  @Get('detail')
  getDetail(@Query() query: MobileTabBarDetailQueryDto) {
    return this.mobileTabBarService.getDetail(query.id)
  }

  // 保存后台底部导航配置。
  @ApiOperation({ summary: '保存小程序底部导航配置' })
  @Post('save')
  saveConfig(@Body() dto: SaveMobileTabBarConfigDto) {
    return this.mobileTabBarService.saveConfig(dto)
  }

  // 修改后台底部导航配置启用状态。
  @ApiOperation({ summary: '修改小程序底部导航配置状态' })
  @Post('status')
  updateStatus(@Body() dto: UpdateMobileTabBarStatusDto) {
    return this.mobileTabBarService.updateStatus(dto)
  }
}
