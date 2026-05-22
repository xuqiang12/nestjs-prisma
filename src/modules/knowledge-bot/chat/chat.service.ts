import { Injectable } from '@nestjs/common'
import { AIRuntime } from '../../../ai-engine/core/ai.runtime'

@Injectable()
export class ChatService {
  constructor(private readonly aiRuntime: AIRuntime) {}

  async chat(message: string, userId?: string) {
    return this.aiRuntime.run({
      input: message,
      userId,
      metadata: {
        source: 'knowledge-bot',
      },
    })
  }
}
