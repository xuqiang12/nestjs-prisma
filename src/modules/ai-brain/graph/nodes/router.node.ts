/**
 * 路由节点 - 决定问题应该走 RAG 还是普通对话
 * 根据问题的性质判断是否需要检索知识库
 */
import { llm } from '../../llm/llm.client'

export async function routerNode(state: any) {
  const res = await llm.invoke(`
判断问题是否需要知识库：
返回：rag 或 chat
问题：${state.question}
`)

  const content =
    typeof res.content === 'string'
      ? res.content
      : Array.isArray(res.content)
        ? res.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('')
        : ''
  console.log('第一步，返回路由结果：', content.trim(), '判断用户问题类型 是走chat还是rag')
  return {
    ...state,
    route: content.trim(),
  }
}
