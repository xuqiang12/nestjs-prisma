import { AIRegistry } from './ai.registry'
import { IntentRouter } from '../router/intent.router'
import { WorkflowEngine } from './workflow.engine'
import { MemoryService, ToolExecutor, ExtendedRouteResult, AgentState } from './interfaces'
import { llmProvider } from '../models/llm.provider'

export class Orchestrator {
  constructor(
    private registry: AIRegistry,
    private router: IntentRouter,
    private workflowEngine: WorkflowEngine,
    private memoryService?: MemoryService,
    private toolExecutor?: ToolExecutor,
  ) {
    console.log('[Orchestrator（orchestrator）] 构造函数-初始化完成✅')
  }

  async execute(input: { message: string; userId?: string }) {
    const { message, userId } = input

    console.log('───────────────────────────────────────────────────────────')
    console.log('[Orchestrator（orchestrator）] 第二步-执行请求:', { message, userId })
    console.log('───────────────────────────────────────────────────────────')

    let memory = null
    if (this.memoryService && userId) {
      console.log('[Orchestrator（orchestrator）] 第三步-读取用户记忆...')
      memory = await this.memoryService.getShortMemory(userId)
      console.log('[Orchestrator（orchestrator）] 第三步-读取到记忆:', memory?.length || 0, '条')

      console.log('[Orchestrator（orchestrator）] 第四步-保存用户消息到记忆...')
      await this.memoryService.addMessage(userId, 'user', message)
      console.log('[Orchestrator（orchestrator）] 第四步-用户消息已保存✅')
    } else {
      console.log('[Orchestrator（orchestrator）] 第三步-无 userId，跳过记忆读取')
    }

    console.log('[Orchestrator（orchestrator）] 第五步-开始路由判断...')
    const route = await this.routeWithLLM(message)
    console.log('[Orchestrator（orchestrator）] 第五步-路由结果:', route)

    console.log('[Orchestrator（orchestrator）] 第六步-根据路由类型分流执行:', route.type)
    let result

    switch (route.type) {
      case 'chat':
        console.log('[Orchestrator（orchestrator）] 第六步-分支: CHAT 对话模式')
        result = await this.workflowEngine.chat(message, memory)
        break

      case 'rag':
        console.log('[Orchestrator（orchestrator）] 第六步-分支: RAG 知识库模式')
        result = await this.workflowEngine.rag(message)
        break

      case 'tool':
        console.log('[Orchestrator（orchestrator）] 第六步-分支: TOOL 工具模式', route.tools)
        result = await this.workflowEngine.tool(message, route.tools || [])
        break

      case 'summary':
        console.log('[Orchestrator（orchestrator）] 第六步-分支: SUMMARY 摘要模式')
        result = await this.workflowEngine.summary(message)
        break

      case 'agent':
        console.log('[Orchestrator（orchestrator）] 第六步-分支: AGENT 代理模式')
        result = await this.runAgentLoop(message, memory)
        break

      default:
        console.log('[Orchestrator（orchestrator）] 第六步-分支: 默认 CHAT 模式')
        result = await this.workflowEngine.chat(message, memory)
    }

    console.log('[Orchestrator（orchestrator）] 第七步-Workflow 执行结果:', result)

    if (this.memoryService && userId && result?.answer) {
      console.log('[Orchestrator（orchestrator）] 第八步-保存助手回复到记忆...')
      await this.memoryService.addMessage(userId, 'assistant', result.answer)
      console.log('[Orchestrator（orchestrator）] 第八步-助手回复已保存✅')
    }

    console.log('───────────────────────────────────────────────────────────')
    console.log('[Orchestrator（orchestrator）] 第九步-执行完成✅')
    console.log('───────────────────────────────────────────────────────────')

    return result
  }

  private async routeWithLLM(message: string): Promise<ExtendedRouteResult> {
    console.log('[Orchestrator（routeWithLLM）] 开始 LLM 路由判断...')

    const toolsPrompt = this.toolExecutor
      ? `\n可用工具: ${this.toolExecutor.listTools().map(t => t.name).join(', ')}`
      : ''

    const prompt = `
你是一个智能路由助手。请判断用户问题属于以下哪种类型:

1. chat - 普通对话，不需要额外工具
2. rag - 需要知识库检索
3. tool - 需要使用工具${toolsPrompt}
4. summary - 需要生成摘要
5. agent - 需要多步推理

问题: ${message}

请以 JSON 格式返回:
{
  "type": "chat|rag|tool|summary|agent",
  "confidence": 0-1,
  "tools": ["工具名1", "工具名2"],
  "reason": "原因"
}
`

    console.log('[Orchestrator（routeWithLLM）] 调用 LLM...')
    const response = await llmProvider.invoke(prompt)
    console.log('[Orchestrator（routeWithLLM）] LLM 返回:', response)

    try {
      console.log('[Orchestrator（routeWithLLM）] 开始解析响应...')
      let jsonStr = response

      if (jsonStr.includes('```json')) {
        console.log('[Orchestrator（routeWithLLM）] 检测到 Markdown 代码块，正在清理...')
        const startIdx = jsonStr.indexOf('```json') + 7
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          console.log('[Orchestrator（routeWithLLM）] 清理后的 JSON:', jsonStr)
        }
      } else if (jsonStr.includes('```')) {
        console.log('[Orchestrator（routeWithLLM）] 检测到无标签代码块，正在清理...')
        const startIdx = jsonStr.indexOf('```') + 3
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          console.log('[Orchestrator（routeWithLLM）] 清理后的 JSON:', jsonStr)
        }
      }

      const parsed = JSON.parse(jsonStr)
      console.log('[Orchestrator（routeWithLLM）] JSON 解析成功:', parsed)
      return {
        type: parsed.type || 'chat',
        confidence: parsed.confidence || 0.5,
        tools: parsed.tools || [],
        reason: parsed.reason,
      }
    } catch (e) {
      console.error('[Orchestrator（routeWithLLM）] ❌ JSON 解析失败:', e)
      console.error('[Orchestrator（routeWithLLM）] 原始响应:', response)
      return {
        type: 'chat',
        confidence: 0.3,
        reason: '解析失败，默认使用chat',
      }
    }
  }

  async runAgentLoop(message: string, memory: any) {
    console.log('───────────────────────────────────────────────────────────')
    console.log('[Orchestrator（Agent）] 启动 Agent 循环')
    console.log('───────────────────────────────────────────────────────────')

    const state: AgentState = {
      message,
      memory,
      steps: [],
      result: null,
    }

    for (let i = 0; i < 5; i++) {
      console.log(`[Orchestrator（Agent）] ========== Agent第${i + 1}步开始 ==========`)

      console.log('[Orchestrator（Agent）] 决定下一步动作...')
      const action = await this.decideNextAction(state)
      console.log('[Orchestrator（Agent）] 动作决定:', action)

      if (action.type === 'final') {
        console.log('[Orchestrator（Agent）] ✅ Final 动作，返回最终结果')
        return { answer: action.output, steps: state.steps }
      }

      if (action.type === 'tool' && this.toolExecutor) {
        console.log('[Orchestrator（Agent）] 执行工具:', action.tool, '参数:', action.params)
        try {
          const toolResult = await this.toolExecutor.execute(action.tool, action.params)
          console.log('[Orchestrator（Agent）] 工具执行结果:', toolResult)
          state.steps.push({ action, toolResult })
          state.result = toolResult
          console.log('[Orchestrator（Agent）] Agent状态已更新')
        } catch (e) {
          console.error('[Orchestrator（Agent）] ❌ 工具执行失败:', e)
        }
      }

      console.log(`[Orchestrator（Agent）] ========== Agent第${i + 1}步结束 ==========`)
    }

    console.log('[Orchestrator（Agent）] Agent循环结束，返回结果')
    return { answer: state.result, steps: state.steps }
  }

  private async decideNextAction(state: AgentState) {
    console.log('[Orchestrator（decideNextAction）] Agent思考中...')

    const history = state.steps.map(s => JSON.stringify(s)).join('\n')

    const prompt = `
当前状态:
消息: ${state.message}
历史步骤: ${history}
当前结果: ${state.result}

请决定下一步动作，返回JSON格式:
{
  "type": "tool|final",
  "tool": "工具名",
  "params": { "key": "value" },
  "output": "最终回答"
}
`

    console.log('[Orchestrator（decideNextAction）] 调用 LLM 决策...')
    const response = await llmProvider.invoke(prompt)
    console.log('[Orchestrator（decideNextAction）] LLM 返回:', response)

    try {
      console.log('[Orchestrator（decideNextAction）] 开始解析Agent响应...')
      let jsonStr = response

      if (jsonStr.includes('```json')) {
        console.log('[Orchestrator（decideNextAction）] 检测到 Markdown 代码块，正在清理...')
        const startIdx = jsonStr.indexOf('```json') + 7
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          console.log('[Orchestrator（decideNextAction）] 清理后的 JSON:', jsonStr)
        }
      } else if (jsonStr.includes('```')) {
        console.log('[Orchestrator（decideNextAction）] 检测到无标签代码块，正在清理...')
        const startIdx = jsonStr.indexOf('```') + 3
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          console.log('[Orchestrator（decideNextAction）] 清理后的 JSON:', jsonStr)
        }
      }

      const action = JSON.parse(jsonStr)
      console.log('[Orchestrator（decideNextAction）] Agent思考结果解析成功:', action)
      return action
    } catch (e) {
      console.error('[Orchestrator（decideNextAction）] ❌ Agent思考结果解析失败:', e)
      console.error('[Orchestrator（decideNextAction）] 原始响应:', response)
      return { type: 'final', output: '处理完成' }
    }
  }

  async stream(message: string) {
    console.log('[Orchestrator（stream）] 流式输出模式')
    return this.workflowEngine.stream(message)
  }
}
