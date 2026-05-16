// /**
//  * LangGraph 工作流构建器 - 组装 AI 对话流程
//  * 包含路由、检索、回答等节点的编排
//  */
// import { StateGraph } from '@langchain/langgraph'
// import { routerNode } from './nodes/router.node'
// import { VectorStoreService } from '../vector-store/vector-store.service'
// import { ragAnswerNode } from './nodes/rag-answer.node'
// import { chatNode } from './nodes/chat.node'
// type AIState = {
//   question: string
//   route: string
//   context: string
//   answer: string
// }

// export function createWorkflow() {
//   const graph = new StateGraph<AIState>({
//     channels: {
//       question: null,
//       route: null,
//       context: null,
//       answer: null,
//     },
//   })

//   const vectorService = new VectorStoreService()

//   graph.addNode('router', routerNode)
//   graph.addNode('retrieval', vectorService.searchSimilar)
//   graph.addNode('ragAnswer', ragAnswerNode)
//   graph.addNode('chat', chatNode)

//   graph.setEntryPoint('router')

//   graph.addConditionalEdges('router', (state) => {
//     return state.route === 'rag' ? 'retrieval' : 'chat'
//   })

//   graph.addEdge('retrieval', 'ragAnswer')

//   graph.setFinishPoint('chat')
//   graph.setFinishPoint('ragAnswer')

//   return graph.compile()
// }
