import { ragWorkflow } from '../workflow/rag.workflow'
import { chatWorkflow } from '../workflow/chat.workflow'
import { llmProvider } from '../models/llm.provider'
import { PROMPTS } from '../prompts'

export class WorkflowEngine {
  constructor() {
    console.log('[WorkflowEngine（workflow-engine）] 构造函数-初始化完成✅')
  }

  async chat(message: string, memory?: any) {
    console.log('[WorkflowEngine（chat）] 开始 CHAT 工作流...')

    let prompt = message

    if (memory && memory.length > 0) {
      console.log('[WorkflowEngine（chat）] 包含记忆，构建历史上下文...')
      const history = memory.map((m: any) => `${m.role}: ${m.content}`).join('\n')
      prompt = `${history}\n\n用户: ${message}`
      console.log('[WorkflowEngine（chat）] 构建的 Prompt 长度:', prompt.length)
    } else {
      console.log('[WorkflowEngine（chat）] 无记忆，直接使用原始消息')
    }

    console.log('[WorkflowEngine（chat）] 调用 ChatWorkflow...')
    const context = await chatWorkflow.run({ input: prompt })
    console.log('[WorkflowEngine（chat）] ChatWorkflow 返回:', context.output)

    return context.output
  }

  async rag(message: string) {
    console.log('[WorkflowEngine（rag）] 开始 RAG 工作流...')

    console.log('[WorkflowEngine（rag）] 调用 RagWorkflow...')
    const context = await ragWorkflow.run({ input: message })
    console.log('[WorkflowEngine（rag）] RagWorkflow 返回:', context.output)

    return context.output
  }

  async tool(message: string, tools: string[]) {
    console.log('[WorkflowEngine（tool）] 开始 TOOL 工作流，工具:', tools)

    const prompt = `
问题: ${message}
可用工具: ${tools.join(', ')}

请思考需要使用哪些工具，并给出结果。
`

    console.log('[WorkflowEngine（tool）] 调用 LLM...')
    const content = await llmProvider.invoke(prompt)
    console.log('[WorkflowEngine（tool）] LLM 返回:', content)

    return { answer: content, tools }
  }

  async summary(message: string) {
    console.log('[WorkflowEngine（summary）] 开始 SUMMARY 工作流...')

    const prompt = `
请对以下内容进行摘要:

${message}
`

    console.log('[WorkflowEngine（summary）] 调用 LLM...')
    const content = await llmProvider.invoke(prompt)
    console.log('[WorkflowEngine（summary）] LLM 返回:', content)

    return { summary: content }
  }

  async stream(message: string) {
    console.log('[WorkflowEngine（stream）] STREAM 模式')
    return { type: 'stream', message }
  }
}

export const workflowEngine = new WorkflowEngine()
