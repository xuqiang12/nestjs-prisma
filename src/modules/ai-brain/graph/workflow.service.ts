import { Injectable } from '@nestjs/common'
import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { VectorStoreService } from '../vector-store/vector-store.service'

import { routerNode } from './nodes/router.node'
import { ragAnswerNode } from './nodes/rag-answer.node'
import { chatNode } from './nodes/chat.node'

const AIState = Annotation.Root({
  question: Annotation<string>(), // 用户输入的问题
  route: Annotation<string>(), // 路由结果
  context: Annotation<string>(), // 检索到的上下文
  answer: Annotation<string>(), // 最终回答
})

type AIStateType = typeof AIState.State

//向量搜索返回的数据结构
interface SearchResult {
  content: string // 检索到的内容
  metadata?: unknown // 元数据
  distance?: number // 相似度
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
      console.log('第二步，用问题去数据库搜最相似的 5 条：', docs.map((d) => d.content).join('\n'))
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
    console.log('用户输入的问题：', question)
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
