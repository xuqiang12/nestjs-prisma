// 封装新版智能体运行时内部使用的模型调用客户端。
import { BadRequestException, Injectable } from '@nestjs/common'
import OpenAI from 'openai'

export type RuntimeChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type RuntimeLlmOptions = {
  model?: string
  baseUrl?: string
  apiKey?: string
  temperature?: number
  topP?: number
  roleTemplateStops?: boolean
}

const ROLE_TEMPLATE_STOPS = ['\nuser\n', '\nassistant\n', '\nsystem\n']

@Injectable()
export class RuntimeLlmClientService {
  // 使用 OpenAI 兼容接口执行新版智能体运行时内部的非流式模型调用。
  async invokeWithMessages(messages: RuntimeChatMessage[], options: RuntimeLlmOptions = {}) {
    const resolved = this.assertModelOptions(options)
    const res = await this.createClient(resolved).chat.completions.create({
      model: resolved.model,
      messages,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.8,
      ...(options.roleTemplateStops ? { stop: ROLE_TEMPLATE_STOPS } : {}),
    })

    return res.choices[0].message.content || ''
  }

  // 创建 OpenAI 兼容客户端实例。
  private createClient(options: Required<Pick<RuntimeLlmOptions, 'baseUrl' | 'apiKey'>>) {
    return new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    })
  }

  // 校验运行时上下文已经携带完整模型连接参数。
  private assertModelOptions(options: RuntimeLlmOptions) {
    if (!options.model || !options.baseUrl || !options.apiKey) {
      throw new BadRequestException('Runtime LLM model config is incomplete')
    }
    return options as Required<Pick<RuntimeLlmOptions, 'model' | 'baseUrl' | 'apiKey'>> & RuntimeLlmOptions
  }
}
