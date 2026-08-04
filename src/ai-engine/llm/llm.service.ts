import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LlmOptions = {
  model?: string
  baseUrl?: string
  apiKey?: string
  provider?: string
  temperature?: number
  topP?: number
  finalAnswerGuard?: boolean
  roleTemplateStops?: boolean
}

const FINAL_ANSWER_GUARD = [
  '你只能输出面向最终用户的中文答复。',
  '不要输出或复述消息角色、对话模板、调试信息、编号占位符。',
  '不要输出单独成行的 user、assistant、system。',
].join('\n')

const ROLE_TEMPLATE_STOPS = ['\nuser\n', '\nassistant\n', '\nsystem\n']

@Injectable()
export class LlmService {
  // 兼容简单 prompt 调用，把单条用户输入包装成标准 messages 后发送给模型。
  async invoke(prompt: string): Promise<string> {
    return this.invokeWithMessages([{ role: 'user', content: prompt }])
  }

  // 使用 OpenAI 兼容的 Chat Completions 接口发起一次非流式对话。
  async invokeWithMessages(messages: ChatMessage[], options: LlmOptions = {}): Promise<string> {
    const res = await this.createClient(options).chat.completions.create({
      model: options.model || process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages: options.finalAnswerGuard ? this.withFinalAnswerGuard(messages) : messages,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.8,
      ...(options.roleTemplateStops ? { stop: ROLE_TEMPLATE_STOPS } : {}),
    })

    return res.choices[0].message.content || ''
  }

  // 使用 OpenAI 兼容的流式接口逐段返回模型生成的文本内容。
  async *streamWithMessages(messages: ChatMessage[], options: LlmOptions = {}): AsyncIterable<string> {
    const stream = await this.createClient(options).chat.completions.create({
      model: options.model || process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages: options.finalAnswerGuard ? this.withFinalAnswerGuard(messages) : messages,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.8,
      stream: true,
      ...(options.roleTemplateStops ? { stop: ROLE_TEMPLATE_STOPS } : {}),
    })

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        // 只向上层暴露文本增量，SSE 事件格式由 controller/service 负责。
        yield content
      }
    }
  }

  private createClient(options: LlmOptions) {
    return new OpenAI({
      apiKey: options.apiKey || process.env.SILICONFLOW_API_KEY,
      baseURL: options.baseUrl || process.env.SILICONFLOW_BASE_URL,
    })
  }

  private withFinalAnswerGuard(messages: ChatMessage[]) {
    const [first, ...rest] = messages
    if (first?.role === 'system') {
      return [{ ...first, content: `${first.content}\n\n${FINAL_ANSWER_GUARD}` }, ...rest]
    }
    return [{ role: 'system' as const, content: FINAL_ANSWER_GUARD }, ...messages]
  }
}
