import { Injectable } from '@nestjs/common'
import { MemoryService as IMemoryService } from '../core/interfaces'

@Injectable()
export class InMemoryMemoryService implements IMemoryService {
  private memories: Map<string, Array<{ role: string; content: string; timestamp: number }>> =
    new Map()

  // 读取指定用户最近的短期记忆，限制返回数量避免 prompt 过长。
  async getShortMemory(userId: string) {
    const memory = this.memories.get(userId) || []
    return memory.slice(-10)
  }

  // 追加一条用户上下文记忆，并在超过上限时移除最早的记录。
  async addMessage(userId: string, role: string, content: string) {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, [])
    }

    const memory = this.memories.get(userId)!
    memory.push({ role, content, timestamp: Date.now() })

    if (memory.length > 50) {
      memory.shift()
    }
  }

  // 清空指定用户的临时记忆。
  async clearMemory(userId: string) {
    this.memories.delete(userId)
  }
}

// 删除全局实例，只使用 NestJS DI 容器
// export const memoryService = new InMemoryMemoryService()
