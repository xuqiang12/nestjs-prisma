import { Injectable } from '@nestjs/common'
import { AiOrchestratorService } from '../../../ai-engine/orchestrator/ai-orchestrator.service'

@Injectable()
export class ChatService {
  constructor(private readonly aiOrchestratorService: AiOrchestratorService) {}

  async chat(message: string, userId?: string) {
    return this.aiOrchestratorService.chat(message)
  }

  stream(message: string) {
    return this.aiOrchestratorService.stream(message)
  }
}
