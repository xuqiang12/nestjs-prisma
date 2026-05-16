import { Injectable } from '@nestjs/common'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { VectorStoreService } from '../vector-store/vector-store.service'

import { routerNode } from './nodes/router.node'
import { ragAnswerNode } from './nodes/rag-answer.node'
import { chatNode } from './nodes/chat.node'

type AIStateType = {
  question: string
  route: string
  context: string
  answer: string
}
/**
 * State 定义（新版 LangGraph）
 */
const AIState = Annotation.Root({
  question: Annotation<string>(),
  route: Annotation<string>(),
  context: Annotation<string>(),
  answer: Annotation<string>(),
})

@Injectable()
export class WorkflowService {
  private workflow

  constructor(private readonly vectorStore: VectorStoreService) {
    this.workflow = this.createWorkflow()
  }

  createWorkflow() {
    const graph = new StateGraph<AIStateType>(AIState)

    // 1️⃣ router（意图分类）
    graph.addNode('router', routerNode)

    // 2️⃣ 向量检索节点
    graph.addNode('retrieval', async (state: AIStateType) => {
      const docs = await this.vectorStore.searchSimilar(state.question, 5)

      return {
        // context: docs.map((d) => d.content).join('\n'),
      }
    })

    // 3️⃣ RAG回答
    graph.addNode('ragAnswer', ragAnswerNode)

    // 4️⃣ 普通聊天
    graph.addNode('chat', chatNode)

    // // 入口
    graph.addEdge(START, 'router')

    // // 分流逻辑
    // graph.addConditionalEdges('router', (state) => {
    //   return state.route === 'rag' ? 'retrieval' : 'chat'
    // })

    // // RAG链路
    // graph.addEdge('retrieval', 'ragAnswer')
    // graph.addEdge('ragAnswer', END)

    // // chat链路
    // graph.addEdge('chat', END)

    return graph.compile()
  }

  /**
   * 对外调用入口
   */
  async run(question: string) {
    const result = await this.workflow.invoke({
      question,
      route: '',
      context: '',
      answer: '',
    })

    return {
      answer: result.answer,
      route: result.route,
    }
  }
}
