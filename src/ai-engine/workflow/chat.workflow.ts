import { Workflow, WorkflowContext } from '../core/types'
import { chatNode } from '../nodes/chat.node'

export class ChatWorkflow implements Workflow {
  name = 'knowledge-bot.chat'

  async run(context: WorkflowContext): Promise<WorkflowContext> {
    console.log('───────────────────────────────────────────────────────────')
    console.log('[ChatWorkflow（chat-workflow）] 开始执行，输入:', context.input)
    console.log('───────────────────────────────────────────────────────────')

    let state: any = {
      question: context.input,
      answer: '',
    }

    console.log('[ChatWorkflow（chat-workflow）] 执行 ChatNode...')
    state = await chatNode(state)
    console.log('[ChatWorkflow（chat-workflow）] ChatNode 完成，答案长度:', state.answer?.length || 0)

    console.log('───────────────────────────────────────────────────────────')
    console.log('[ChatWorkflow（chat-workflow）] 执行完成✅')
    console.log('───────────────────────────────────────────────────────────')

    return {
      ...context,
      output: {
        answer: state.answer,
        route: 'chat',
      },
    }
  }
}

export const chatWorkflow = new ChatWorkflow()
