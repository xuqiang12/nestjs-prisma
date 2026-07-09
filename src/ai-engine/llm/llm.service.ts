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

  async invoke(prompt: string): Promise<string> {
    return this.invokeWithMessages([{ role: 'user', content: prompt }])
  }

  async invokeWithMessages(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages,
      temperature: 0.2,
      top_p: 0.8,
    })

    return res.choices[0].message.content || ''
  }

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
        yield content
      }
    }
  }
}
