import { Injectable } from '@nestjs/common'
import { ChatMessage, LlmService } from '../llm/llm.service'
import { SearchResult, VectorStoreService } from '../vector/vector-store.service'

export type ChatMode = 'chat' | 'knowledge'

export type CompletionPlan = {
  route: ChatMode
  messages: ChatMessage[]
  sources: SearchResult[]
}

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly llmService: LlmService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async chat(message: string) {
    const plan = await this.buildCompletion(message, 'chat')
    const answer = await this.complete(plan.messages)
    return { answer, route: plan.route }
  }

  async *stream(message: string): AsyncIterable<string> {
    const plan = await this.buildCompletion(message, 'chat')
    for await (const content of this.streamCompletion(plan.messages)) {
      yield content
    }
  }

  async rag(message: string) {
    const plan = await this.buildCompletion(message, 'knowledge')
    const answer = await this.complete(plan.messages)
    return { answer, route: 'rag', sources: plan.sources }
  }

  async buildCompletion(
    message: string,
    mode: ChatMode = 'chat',
    history: ChatMessage[] = [],
  ): Promise<CompletionPlan> {
    if (mode === 'knowledge') {
      const sources = await this.vectorStoreService.similaritySearch(message, 5)
      const context = sources.map((item, index) => `【知识${index + 1}】${item.content}`).join('\n')
      const systemPrompt = [
        '你是知识库问答助手。',
        '优先根据给定知识片段回答；如果知识片段不足以回答，请明确说明知识库中没有足够信息。',
        `知识片段：\n${context || '未检索到相关知识片段'}`,
      ].join('\n')

      return {
        route: 'knowledge',
        messages: [{ role: 'system', content: systemPrompt }, ...this.normalizeHistory(history), { role: 'user', content: message }],
        sources,
      }
    }

    return {
      route: 'chat',
      messages: [...this.normalizeHistory(history), { role: 'user', content: message }],
      sources: [],
    }
  }

  async complete(messages: ChatMessage[]) {
    return this.llmService.invokeWithMessages(messages)
  }

  streamCompletion(messages: ChatMessage[]) {
    return this.llmService.streamWithMessages(messages)
  }

  private normalizeHistory(history: ChatMessage[]) {
    return history.filter((item) => item.role === 'user' || item.role === 'assistant')
  }
}
