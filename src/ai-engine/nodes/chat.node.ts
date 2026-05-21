import { llmProvider } from '../models/llm.provider'
import { PROMPTS } from '../prompts'

export async function chatNode(state: any) {
  console.log('[ChatNode（chat-node）] 开始执行...')
  console.log('[ChatNode（chat-node）] 问题:', state.question)

  const prompt = PROMPTS.chat.replace('{question}', state.question)

  console.log('[ChatNode（chat-node）] 调用 LLM...')
  const content = await llmProvider.invoke(prompt)
  console.log('[ChatNode（chat-node）] LLM 返回长度:', content.length)
  console.log('[ChatNode（chat-node）] 答案:', content.substring(0, 200), content.length > 200 ? '...' : '')

  return {
    ...state,
    answer: content,
  }
}
