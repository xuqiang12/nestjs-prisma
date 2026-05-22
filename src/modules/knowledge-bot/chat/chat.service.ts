import { Injectable } from '@nestjs/common'
import { AIRuntime } from '../../../ai-engine/core/ai.runtime'

@Injectable()
export class ChatService {
  constructor(private readonly aiRuntime: AIRuntime) {}

  async chat(message: string, userId?: string) {
    console.log('2、调用 Orchestrator 运行工作流...', {
      input: message,
      userId,
      metadata: {
        source: 'knowledge-bot',
      },
    })

    return this.aiRuntime.run({
      input: message,
      userId,
      metadata: {
        source: 'knowledge-bot',
      },
    })
  }
}
