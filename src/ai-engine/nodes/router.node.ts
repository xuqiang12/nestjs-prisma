import { llmProvider } from '../models/llm.provider'

export async function routerNode(state: any) {
  console.log('[RouterNode（router-node）]开始执行...  问题:', state.question)

  const prompt = `
判断问题是否需要知识库：
返回：rag 或 chat
问题：${state.question}
`

  const content = await llmProvider.invoke(prompt)
  console.log('[RouterNode（router-node）] LLM 返回:', content)

  const trimmedContent = content.trim()
  console.log('[RouterNode（router-node）] 路由决策结果:', trimmedContent)

  return {
    ...state,
    route: trimmedContent,
  }
}
