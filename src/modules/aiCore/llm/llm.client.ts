import { ChatOpenAI } from '@langchain/openai'

export const llm = new ChatOpenAI({
  model: 'doubao-pro',
  apiKey: process.env.DOUBAO_KEY,
  configuration: {
    baseURL: 'https://xxx.doubao.com/v1',
  },
})
