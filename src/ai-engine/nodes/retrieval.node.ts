import { vectorStore } from '../infra/vector-store.provider'

export async function retrievalNode(state: any) {
  console.log('[RetrievalNode（retrieval-node）] 开始执行...')
  console.log('[RetrievalNode（retrieval-node）] 查询:', state.question)

  console.log('[RetrievalNode（retrieval-node）] 调用 VectorStore 相似度搜索...')
  const docs = await vectorStore.similaritySearch(state.question, 5)
  console.log('[RetrievalNode（retrieval-node）] 找到', docs.length, '个相关文档')

  docs.forEach((doc, i) => {
    console.log(`[RetrievalNode（retrieval-node）] 文档${i + 1}:`, {
      id: doc.id,
      distance: doc.distance,
      contentLength: doc.content?.length,
    })
  })

  const context = docs.map((d) => d.content).join('\n')
  console.log('[RetrievalNode（retrieval-node）] 合并后的上下文长度:', context.length)

  return {
    ...state,
    context,
  }
}
