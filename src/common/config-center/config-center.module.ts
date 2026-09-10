// 这个文件注册文件型配置中心的读取服务。
import { Module } from '@nestjs/common'
import { ConfigCenterService } from './config-center.service'

@Module({
  providers: [ConfigCenterService],
  exports: [ConfigCenterService],
})
export class ConfigCenterModule {}
