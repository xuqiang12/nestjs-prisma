/**
 * LLM 客户端 - 初始化和配置大语言模型
 * 使用豆包 doubao-pro 模型
 */
import { ChatOpenAI } from '@langchain/openai'

export const llm = new ChatOpenAI({
  model: 'doubao-pro',
  apiKey: process.env.DOUBAO_KEY,
  configuration: {
    baseURL: 'https://xxx.doubao.com/v1',
  },
})
