import { llmProvider } from '../models/llm.provider'
import { PROMPTS } from '../prompts'

export async function ragAnswerNode(state: any) {
  console.log('[RAGAnswerNode（rag-answer-node）] 开始执行...')
  console.log('[RAGAnswerNode（rag-answer-node）] 问题长度:', state.question?.length)
  console.log('[RAGAnswerNode（rag-answer-node）] 上下文长度:', state.context?.length)

  const prompt = PROMPTS.ragAnswer
    .replace('{context}', state.context)
    .replace('{question}', state.question)

  console.log('[RAGAnswerNode（rag-answer-node）] 构建 Prompt 完成，调用 LLM...')
  const content = await llmProvider.invoke(prompt)
  console.log('[RAGAnswerNode（rag-answer-node）] LLM 返回长度:', content.length)
  console.log('[RAGAnswerNode（rag-answer-node）] 答案:', content.substring(0, 200), content.length > 200 ? '...' : '')

  return {
    ...state,
    answer: content,
  }
}
