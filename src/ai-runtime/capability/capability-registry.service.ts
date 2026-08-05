// 注册新版智能体能力和对应执行处理器。
import { BadRequestException, Injectable } from '@nestjs/common'
import { CapabilityHandler, CapabilityType } from './capability.types'

@Injectable()
export class CapabilityRegistry {
  private readonly handlers = new Map<CapabilityType, CapabilityHandler>()

  // 根据静态注入的处理器初始化能力注册表。
  constructor(handlers: CapabilityHandler[] = []) {
    handlers.forEach((handler) => this.register(handler))
  }

  // 注册单个能力处理器，供 Executor 统一查找。
  register(handler: CapabilityHandler) {
    this.handlers.set(handler.capability, handler)
  }

  // 根据能力类型返回对应处理器。
  get(capability: CapabilityType) {
    const handler = this.handlers.get(capability)
    if (!handler) {
      throw new BadRequestException(`能力处理器未注册：${capability}`)
    }
    return handler
  }
}
