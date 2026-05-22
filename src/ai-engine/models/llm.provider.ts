import OpenAI from 'openai'
import { LLMProvider } from './llm.interface'

export class SiliconFlowLLMProvider implements LLMProvider {
  private client: OpenAI

  constructor() {
    log.info('models/llm.provider LLM 初始化配置', {
      'API Key': process.env.SILICONFLOW_API_KEY ? '已设置' : '未设置',
      'Base URL': process.env.SILICONFLOW_BASE_URL,
      Model: process.env.SILICONFLOW_MODEL,
    })
    this.client = new OpenAI({
      apiKey: process.env.SILICONFLOW_API_KEY,
      baseURL: process.env.SILICONFLOW_BASE_URL,
    })
  }

  async invoke(prompt: string): Promise<string> {
    log.info('models/llm.provider LLM 调用', {
      'Prompt 预览': prompt.substring(0, 150) + (prompt.length > 150 ? '...' : ''),
      'Prompt 长度': prompt.length,
    })

    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      top_p: 0.8,
    })

    const content = res.choices[0].message.content || ''
    log.info('models/llm.provider LLM 返回', {
      返回内容预览: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
      返回内容长度: content.length,
    })
    return content
  }

  async invokeWithMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    log.info('models/llm.provider LLM 调用（多消息）', {
      消息数量: messages.length,
    })
    messages.forEach((msg, i) => {
      log.info(`models/llm.provider LLM 调用（多消息） 消息${i + 1}`, {
        role: msg.role,
        内容长度: msg.content.length,
      })
    })

    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages: messages as any,
      temperature: 0.2,
      top_p: 0.8,
    })

    const content = res.choices[0].message.content || ''
    log.info('models/llm.provider LLM 返回', {
      返回内容预览: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
      返回内容长度: content.length,
    })
    return content
  }
}

export const llmProvider = new SiliconFlowLLMProvider()
