import OpenAI from 'openai'
import { LLMProvider } from './llm.interface'

export class SiliconFlowLLMProvider implements LLMProvider {
  private client: OpenAI

  constructor() {
    console.log('[SiliconFlowLLMProvider（llm）] 构造函数-初始化...')
    console.log('[SiliconFlowLLMProvider（llm）] API Key:', process.env.SILICONFLOW_API_KEY ? '已设置' : '未设置')
    console.log('[SiliconFlowLLMProvider（llm）] Base URL:', process.env.SILICONFLOW_BASE_URL)
    console.log('[SiliconFlowLLMProvider（llm）] Model:', process.env.SILICONFLOW_MODEL)
    this.client = new OpenAI({
      apiKey: process.env.SILICONFLOW_API_KEY,
      baseURL: process.env.SILICONFLOW_BASE_URL,
    })
    console.log('[SiliconFlowLLMProvider（llm）] 构造函数-初始化完成✅')
  }

  async invoke(prompt: string): Promise<string> {
    console.log('[SiliconFlowLLMProvider（invoke）] 调用 LLM...')
    console.log('[SiliconFlowLLMProvider（invoke）] Prompt 长度:', prompt.length)
    console.log('[SiliconFlowLLMProvider（invoke）] Prompt 预览:', prompt.substring(0, 150), prompt.length > 150 ? '...' : '')

    const startTime = Date.now()
    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      top_p: 0.8,
    })

    const duration = Date.now() - startTime
    const content = res.choices[0].message.content || ''
    console.log('[SiliconFlowLLMProvider（invoke）] LLM 返回，耗时:', duration, 'ms')
    console.log('[SiliconFlowLLMProvider（invoke）] 返回内容长度:', content.length)
    console.log('[SiliconFlowLLMProvider（invoke）] 返回内容预览:', content.substring(0, 150), content.length > 150 ? '...' : '')

    return content
  }

  async invokeWithMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    console.log('[SiliconFlowLLMProvider（invokeWithMessages）] 调用 LLM（多消息）...')
    console.log('[SiliconFlowLLMProvider（invokeWithMessages）] 消息数量:', messages.length)
    messages.forEach((msg, i) => {
      console.log(`[SiliconFlowLLMProvider（invokeWithMessages）] 消息${i + 1}:`, {
        role: msg.role,
        contentLength: msg.content.length,
      })
    })

    const startTime = Date.now()
    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages: messages as any,
      temperature: 0.2,
      top_p: 0.8,
    })

    const duration = Date.now() - startTime
    const content = res.choices[0].message.content || ''
    console.log('[SiliconFlowLLMProvider（invokeWithMessages）] LLM 返回，耗时:', duration, 'ms')
    console.log('[SiliconFlowLLMProvider（invokeWithMessages）] 返回内容长度:', content.length)

    return content
  }
}

export const llmProvider = new SiliconFlowLLMProvider()
