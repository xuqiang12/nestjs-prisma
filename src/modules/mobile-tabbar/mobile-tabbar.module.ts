import { Module } from '@nestjs/common'
import { MobileTabBarController } from './mobile-tabbar.controller'
import { MobileTabBarService } from './mobile-tabbar.service'

@Module({
  controllers: [MobileTabBarController],
  providers: [MobileTabBarService],
})
export class MobileTabBarModule {}
