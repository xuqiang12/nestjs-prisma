import { Injectable } from '@nestjs/common'
import { StateGraph, START, END } from '@langchain/langgraph'

import { routerNode } from '../nodes/router.node'
import { ragAnswerNode } from '../nodes/rag-answer.node'
import { chatNode } from '../nodes/chat.node'
import { VectorStoreService } from '../../vector-store/vector-store.service'

type AIState = {
  question: string
  route: string
  context: string
  answer: string
}

@Injectable()
export class WorkflowService {
  constructor(private readonly vectorStore: VectorStoreService) {}

  createWorkflow() {
    // ✅ 关键：必须用 channels（当前版本要求）
    const graph = new StateGraph<AIState>({
      channels: {
        question: null,
        route: null,
        context: null,
        answer: null,
      },
    })

    graph.addNode('router', routerNode)

    graph.addNode('retrieval', async (state: AIState) => {
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
