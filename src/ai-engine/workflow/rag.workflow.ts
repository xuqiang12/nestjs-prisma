import { Workflow, WorkflowContext } from '../core/types'
import { routerNode } from '../nodes/router.node'
import { retrievalNode } from '../nodes/retrieval.node'
import { ragAnswerNode } from '../nodes/rag-answer.node'

export class RAGWorkflow implements Workflow {
  name = 'knowledge-bot.rag'

  async run(context: WorkflowContext): Promise<WorkflowContext> {
    console.log('[RAGWorkflow（rag-workflow）] 开始 RAG 工作流，输入:', context.input)

    let state: any = {
      question: context.input,
      route: '',
      context: '',
      answer: '',
    }

    state = await routerNode(state)
    console.log('[RAGWorkflow（rag-workflow）] 第一步-完成，路由结果:', state.route)

    state = await retrievalNode(state)
    console.log(
      '[RAGWorkflow（rag-workflow）] 第二步-完成，检索到上下文长度:',
      state.context?.length || 0,
    )

    state = await ragAnswerNode(state)
    console.log('[RAGWorkflow（rag-workflow）] 第三步-完成，答案长度:', state.answer?.length || 0)

    return {
      ...context,
      output: {
        answer: state.answer,
        route: state.route,
      },
    }
  }
}

export const ragWorkflow = new RAGWorkflow()
