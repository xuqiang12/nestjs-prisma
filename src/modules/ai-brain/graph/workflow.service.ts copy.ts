import { Injectable } from '@nestjs/common'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'

import { ragAnswerNode } from './nodes/rag-answer.node'
import { chatNode } from './nodes/chat.node'
import { routerNode } from './nodes/router.node'
import { VectorStoreService } from '../vector-store/vector-store.service'

// type AIState = {
//   question: string
//   route: string
//   context: string
//   answer: string
// }
const AIState = Annotation.Root({
  question: Annotation<string>(),
  route: Annotation<string>(),
  context: Annotation<string>(),
  answer: Annotation<string>(),
})
@Injectable()
export class WorkflowService {
  constructor(private readonly vectorStore: VectorStoreService) {}

  createWorkflow() {
    const graph = new StateGraph(AIState)

    graph.addNode('router', routerNode)

    graph.addNode('retrieval', async (state: any) => {
      const docs = await this.vectorStore.searchSimilar(state.question, 5)

      return {
        context: docs.map((d) => d.content).join('\n'),
      }
    })

    graph.addNode('ragAnswer', ragAnswerNode)
    graph.addNode('chat', chatNode)

    // entry
    graph.addEdge(START, 'router')

    // route
    graph.addConditionalEdges('router', (state) => {
      return state.route === 'rag' ? 'retrieval' : 'chat'
    })

    graph.addEdge('retrieval', 'ragAnswer')

    // end
    graph.addEdge('ragAnswer', END)
    graph.addEdge('chat', END)

    return graph.compile()
  }
}
