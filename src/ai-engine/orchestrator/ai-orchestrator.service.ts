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

  // 执行普通聊天：构建普通对话消息后调用大模型，并返回本次路由类型。
  async chat(message: string) {
    const plan = await this.buildCompletion(message, 'chat')
    const answer = await this.complete(plan.messages)
    return { answer, route: plan.route }
  }

  // 执行普通聊天的流式输出：复用普通对话消息，只把模型返回的文本片段逐段交给上层。
  async *stream(message: string): AsyncIterable<string> {
    const plan = await this.buildCompletion(message, 'chat')
    for await (const content of this.streamCompletion(plan.messages)) {
      yield content
    }
  }

  // 执行知识库问答：先检索相似知识片段，再把知识上下文和用户问题一起交给模型。
  async rag(message: string) {
    const plan = await this.buildCompletion(message, 'knowledge')
    const answer = await this.complete(plan.messages)
    return { answer, route: 'rag', sources: plan.sources }
  }

  // 构建模型调用计划，统一处理普通聊天和知识库问答所需的消息上下文。
  async buildCompletion(
    message: string,
    mode: ChatMode = 'chat',
    history: ChatMessage[] = [],
  ): Promise<CompletionPlan> {
    if (mode === 'knowledge') {
      // 知识库模式需要先做向量检索，把命中的片段作为 system prompt 的事实依据。
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

  // 根据已构建好的消息数组发起一次非流式模型调用。
  async complete(messages: ChatMessage[]) {
    return this.llmService.invokeWithMessages(messages)
  }

  // 根据已构建好的消息数组发起一次流式模型调用。
  streamCompletion(messages: ChatMessage[]) {
    return this.llmService.streamWithMessages(messages)
  }

  // 过滤历史消息，只保留模型支持的用户消息和助手消息。
  private normalizeHistory(history: ChatMessage[]) {
    return history.filter((item) => item.role === 'user' || item.role === 'assistant')
  }
}
