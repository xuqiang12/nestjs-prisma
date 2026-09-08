// 这个文件注册小程序底部导航接口模块。
import { Module } from '@nestjs/common'
import {
  MobileTabBarController,
  MobileTabBarRuntimeController,
} from './mobile-tabbar.controller'
import { MobileTabBarService } from './mobile-tabbar.service'

@Module({
  controllers: [MobileTabBarRuntimeController, MobileTabBarController],
  providers: [MobileTabBarService],
})
export class MobileTabBarModule {}
