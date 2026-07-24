import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { SaveMobileTabBarConfigDto } from './dto/mobile-tabbar.dto'
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

  @ApiOperation({ summary: '保存并发布小程序底部导航配置' })
  @Post('save')
  saveConfig(@Body() dto: SaveMobileTabBarConfigDto) {
    return this.mobileTabBarService.saveConfig(dto)
  }
}
