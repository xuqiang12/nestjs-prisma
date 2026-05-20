/**
 * 聊天节点 - 处理普通对话场景
 * 直接使用 LLM 生成回答，不涉及知识库检索
 */
import { llm } from '../../llm/llm.client'

export async function chatNode(state: any) {
  const res = await llm.invoke(`回答问题：${state.question}`)

  const content =
    typeof res.content === 'string'
      ? res.content
      : Array.isArray(res.content)
        ? res.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('')
        : ''
  console.log('第四步，chat回答', content)
  return {
    ...state,
    answer: content,
  }
}
