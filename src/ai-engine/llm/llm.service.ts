import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

@Injectable()
export class LlmService {
  private readonly client = new OpenAI({
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseURL: process.env.SILICONFLOW_BASE_URL,
  })

  // 兼容简单 prompt 调用，把单条用户输入包装成标准 messages 后发送给模型。
  async invoke(prompt: string): Promise<string> {
    return this.invokeWithMessages([{ role: 'user', content: prompt }])
  }

  // 使用 OpenAI 兼容的 Chat Completions 接口发起一次非流式对话。
  async invokeWithMessages(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages,
      temperature: 0.2,
      top_p: 0.8,
    })

    return res.choices[0].message.content || ''
  }

  // 使用 OpenAI 兼容的流式接口逐段返回模型生成的文本内容。
  async *streamWithMessages(messages: ChatMessage[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages,
      temperature: 0.2,
      top_p: 0.8,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        // 只向上层暴露文本增量，SSE 事件格式由 controller/service 负责。
        yield content
      }
    }
  }
}
