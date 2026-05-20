// 使用openai 调用
import OpenAI from 'openai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, BaseMessage } from '@langchain/core/messages'
import { ChatResult } from '@langchain/core/outputs' // 修复 1

// 🔥 封装：OpenAI SDK + 支持 invoke / stream / LangChain 生态
export class DoubaoLLM extends BaseChatModel {
  private client: OpenAI

  constructor() {
    super({})
    this.client = new OpenAI({
      apiKey: process.env.SILICONFLOW_API_KEY,
      baseURL: process.env.SILICONFLOW_BASE_URL,
    })
  }

  _llmType() {
    return 'doubao'
  }

  _combineLLMOutput() {
    return {}
  }

  // ✅ 你要的 invoke 就是走这个方法
  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    const msgList = messages.map((m) => {
      let role: 'system' | 'user' | 'assistant' | 'tool'
      const type = m._getType()
      console.log('type', type)
      if (type === 'ai') {
        role = 'assistant'
      } else if (type === 'human') {
        role = 'user'
      } else if (type === 'system') {
        role = 'system'
      } else {
        role = 'user'
      }
      return {
        role,
        content: m.content as string,
      }
    })

    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL,
      messages: msgList,
      temperature: 0.2,
      top_p: 0.8,
    })

    const content = res.choices[0].message.content || ''
    console.log('content', content)
    return {
      generations: [
        {
          message: new AIMessage({ content }),
          text: content,
        },
      ],
    }
  }
}

export const llm = new DoubaoLLM()
