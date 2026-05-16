// import { StateGraph } from '@langchain/langgraph'
// import { routerNode } from './router'
// import { VectorService } from '../vectorStore/vector.service'

// import { ragAnswerNode } from './generation'
// import { chatNode } from './chat'
// export type AIState = {
//   question: string
//   route?: 'chat' | 'rag'
//   context?: string
//   answer?: string
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
//   const vectorService = new VectorService()
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
