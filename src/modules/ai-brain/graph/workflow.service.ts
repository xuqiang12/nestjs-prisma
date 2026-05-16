import { Injectable } from '@nestjs/common'
import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { VectorStoreService } from '../vector-store/vector-store.service'

import { routerNode } from './nodes/router.node'
import { ragAnswerNode } from './nodes/rag-answer.node'
import { chatNode } from './nodes/chat.node'

const AIState = Annotation.Root({
  question: Annotation<string>(),
  route: Annotation<string>(),
  context: Annotation<string>(),
  answer: Annotation<string>(),
})

type AIStateType = typeof AIState.State

interface SearchResult {
  content: string
  metadata?: unknown
  distance?: number
}

@Injectable()
export class WorkflowService {
  private workflow

  constructor(private readonly vectorStore: VectorStoreService) {
    this.workflow = this.createWorkflow()
  }

  createWorkflow() {
    const graph = new StateGraph(AIState) as any

    graph.addNode('router', routerNode)

    graph.addNode('retrieval', async (state: AIStateType) => {
      const docs = (await this.vectorStore.searchSimilar(state.question, 5)) as SearchResult[]
      return {
        context: docs.map((d) => d.content).join('\n'),
      }
    })

    graph.addNode('ragAnswer', ragAnswerNode)

    graph.addNode('chat', chatNode)

    // 入口
    graph.addEdge('__start__', 'router')

    // 分流逻辑
    graph.addConditionalEdges('router', (state: AIStateType) => {
      return state.route === 'rag' ? 'retrieval' : 'chat'
    })
    // RAG链路
    graph.addEdge('retrieval', 'ragAnswer')
    graph.addEdge('ragAnswer', END)

    // chat链路
    graph.addEdge('chat', END)

    return graph.compile()
  }

  async run(question: string) {
    console.log(1123)
    try {
      const result = await this.workflow.invoke({
        question,
        route: '',
        context: '',
        answer: '',
      })
      console.log(result)
      return {
        answer: result.answer,
        route: result.route,
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
