// （决定走不走RAG）
import { llm } from '../llm/llm.client'

export async function routerNode(state: any) {
  const res = await llm.invoke(`
判断问题是否需要知识库：

返回：
rag 或 chat

问题：${state.question}
`)

  return {
    ...state,
    route: typeof res.content === 'string' ? res.content.trim() : '',
  }
}
