import { Injectable } from '@nestjs/common'
import { MemoryService as IMemoryService } from '../core/interfaces'

@Injectable()
export class InMemoryMemoryService implements IMemoryService {
  private memories: Map<string, Array<{ role: string; content: string; timestamp: number }>> =
    new Map()

  constructor() {
    console.log('上下文记忆初始化完成✅')
  }

  async getShortMemory(userId: string) {
    console.log('[MemoryService（getShortMemory）] 读取用户记忆:', userId)
    const memory = this.memories.get(userId) || []
    console.log('[MemoryService（getShortMemory）] 记忆数量:', memory.length, '条（返回最近10条）')
    return memory.slice(-10)
  }

  async addMessage(userId: string, role: string, content: string) {
    console.log('[MemoryService（addMessage）] 添加消息:', {
      userId,
      role,
      contentLength: content.length,
    })

    if (!this.memories.has(userId)) {
      console.log('[MemoryService（addMessage）] 新用户，创建记忆空间')
      this.memories.set(userId, [])
    }

    const memory = this.memories.get(userId)!
    memory.push({ role, content, timestamp: Date.now() })
    console.log('[MemoryService（addMessage）] 消息已添加，当前记忆数量:', memory.length)

    if (memory.length > 50) {
      console.log('[MemoryService（addMessage）] 记忆超过50条，移除最早的1条')
      memory.shift()
    }
  }

  async clearMemory(userId: string) {
    console.log('[MemoryService（clearMemory）] 清空用户记忆:', userId)
    this.memories.delete(userId)
    console.log('[MemoryService（clearMemory）] 记忆已清空✅')
  }
}

// 删除全局实例，只使用 NestJS DI 容器
// export const memoryService = new InMemoryMemoryService()
