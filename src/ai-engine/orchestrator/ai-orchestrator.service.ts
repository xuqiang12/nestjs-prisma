import { Injectable } from '@nestjs/common'
import { LlmService } from '../llm/llm.service'
import { VectorStoreService } from '../vector/vector-store.service'

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly llmService: LlmService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async chat(message: string) {
    const answer = await this.llmService.invoke(message)
    return { answer, route: 'chat' }
  }

  async *stream(message: string): AsyncIterable<string> {
    for await (const content of this.llmService.streamWithMessages([{ role: 'user', content: message }])) {
      yield content
    }
  }

  async rag(message: string) {
    const docs = await this.vectorStoreService.similaritySearch(message, 5)
    const context = docs.map((item) => item.content).join('\n')
    const answer = await this.llmService.invoke(`请根据以下知识回答问题：\n${context}\n\n问题：${message}`)
    return { answer, route: 'rag' }
  }
}
