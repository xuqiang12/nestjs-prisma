/**
 * LLM 客户端 - 初始化和配置大语言模型
 * 使用豆包 doubao-pro 模型
 */

// 使用 LangChain 初始化 LLM 客户端

// import { ChatOpenAI } from '@langchain/openai'

// // 初始化 LLM 客户端
// export const llm = new ChatOpenAI({
//   model: 'ep-你的EndpointID',
//   apiKey: process.env.CHAT_API_KEY,
//   configuration: {
//     baseURL: process.env.CHAT_API_URL_AGENT, // 你的接口地址
//     // baseURL: 'https://ark.cn-beijing.volces.com/api/v3', 只能到v3
//   },
//   temperature: 0.2, // 保持和你原来一致
//   topP: 0.8, // 注意 LangChain 里是大写 P
// })
// 使用openai 调用
import OpenAI from 'openai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, BaseMessage } from '@langchain/core/messages'
import { ChatResult } from '@langchain/core/outputs' // 修复 1

// 🔥 封装：OpenAI SDK + 支持 invoke / stream / LangChain 生态
export class DoubaoLLM extends BaseChatModel {
  private client: OpenAI

  constructor(apiKey: string) {
    super({})
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
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
    const msgList = messages.map((m) => ({
      role: m._getType() === 'ai' ? 'assistant' : m._getType(),
      content: m.content as string,
    }))

    const res = await this.client.chat.completions.create({
      model: 'doubao-seed-1-6-lite-251015',
      messages: msgList,
      temperature: 0.2,
      top_p: 0.8,
    })

    const content = res.choices[0].message.content || ''

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
export const llm = new DoubaoLLM(process.env.CHAT_API_KEY || '')
