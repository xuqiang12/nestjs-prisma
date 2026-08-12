// 封装 OpenAI 兼容模型的非流式与流式调用。
import { BadRequestException, Injectable } from '@nestjs/common'
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
  signal?: AbortSignal
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
  async invoke(prompt: string, options: LlmOptions = {}): Promise<string> {
    return this.invokeWithMessages([{ role: 'user', content: prompt }], options)
  }

  // 使用 OpenAI 兼容的 Chat Completions 接口发起一次非流式对话。
  async invokeWithMessages(messages: ChatMessage[], options: LlmOptions = {}): Promise<string> {
    const resolved = this.assertModelOptions(options)
    // 这里不解析默认模型和密钥；调用方必须先通过上游模型解析入口得到完整运行时模型配置。
    const res = await this.createClient(resolved).chat.completions.create({
      model: resolved.model,
      messages: options.finalAnswerGuard ? this.withFinalAnswerGuard(messages) : messages,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.8,
      ...(options.roleTemplateStops ? { stop: ROLE_TEMPLATE_STOPS } : {}),
    }, {
      signal: options.signal,
    })

    return res.choices[0].message.content || ''
  }

  // 使用 OpenAI 兼容的流式接口逐段返回模型生成的文本内容。
  async *streamWithMessages(
    messages: ChatMessage[],
    options: LlmOptions = {},
  ): AsyncIterable<string> {
    const resolved = this.assertModelOptions(options)
    // LlmService 只向上返回文本增量，外层事件结构由调用方维护。
    const stream = await this.createClient(resolved).chat.completions.create({
      model: resolved.model,
      messages: options.finalAnswerGuard ? this.withFinalAnswerGuard(messages) : messages,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.8,
      stream: true,
      ...(options.roleTemplateStops ? { stop: ROLE_TEMPLATE_STOPS } : {}),
    }, {
      signal: options.signal,
    })

    for await (const chunk of stream) {
      if (options.signal?.aborted) {
        return
      }
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        // 只向上层暴露文本增量，事件格式由调用方负责。
        yield content
      }
    }
  }

  // 创建 OpenAI 兼容客户端实例。
  private createClient(options: Required<Pick<LlmOptions, 'baseUrl' | 'apiKey'>>) {
    return new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    })
  }

  // 校验调用方已经提供完整模型连接参数。
  private assertModelOptions(options: LlmOptions) {
    if (!options.model || !options.baseUrl || !options.apiKey) {
      throw new BadRequestException('LLM model config is incomplete')
    }
    return options as Required<Pick<LlmOptions, 'model' | 'baseUrl' | 'apiKey'>> & LlmOptions
  }

  // 为最终回答消息追加角色模板保护提示。
  private withFinalAnswerGuard(messages: ChatMessage[]) {
    const [first, ...rest] = messages
    if (first?.role === 'system') {
      return [{ ...first, content: `${first.content}\n\n${FINAL_ANSWER_GUARD}` }, ...rest]
    }
    return [{ role: 'system' as const, content: FINAL_ANSWER_GUARD }, ...messages]
  }
}
