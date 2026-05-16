import { llm } from '../llm/llm.client'

export async function ragAnswerNode(state: any) {
  const res = await llm.invoke(`
基于知识库回答：${state.context}
问题：${state.question}
`)

  return {
    ...state,
    answer: res.content,
  }
}
