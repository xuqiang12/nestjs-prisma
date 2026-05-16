/**
 * RAG 回答节点 - 基于检索到的上下文生成回答
 * 用于知识库增强的问答场景
 */
import { llm } from '../../llm/llm.client'

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
