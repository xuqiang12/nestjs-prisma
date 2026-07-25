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
@Controller('mobile-tabbar')
export class MobileTabBarController {
  constructor(private readonly mobileTabBarService: MobileTabBarService) {}

  @Public()
  @ApiOperation({ summary: '获取小程序底部导航配置' })
  @Get('config')
  getConfig() {
    return this.mobileTabBarService.getConfig()
  }

  @ApiOperation({ summary: '获取小程序底部导航配置列表' })
  @Get('list')
  listConfigs() {
    return this.mobileTabBarService.listConfigs()
  }

  @ApiOperation({ summary: '获取小程序底部导航配置详情' })
  @Get('detail')
  getDetail(@Query() query: MobileTabBarDetailQueryDto) {
    return this.mobileTabBarService.getDetail(query.id)
  }

  @ApiOperation({ summary: '保存小程序底部导航配置' })
  @Post('save')
  saveConfig(@Body() dto: SaveMobileTabBarConfigDto) {
    return this.mobileTabBarService.saveConfig(dto)
  }

  @ApiOperation({ summary: '修改小程序底部导航配置状态' })
  @Post('status')
  updateStatus(@Body() dto: UpdateMobileTabBarStatusDto) {
    return this.mobileTabBarService.updateStatus(dto)
  }
}
