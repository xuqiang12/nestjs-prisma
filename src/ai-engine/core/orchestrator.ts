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
  ) {}

  async execute(input: { message: string; userId?: string }) {
    const { message, userId } = input
    log.info('[orchestrator] 第一步-执行请求:', { message, userId })

    let memory = null
    if (this.memoryService && userId) {
      memory = await this.memoryService.getShortMemory(userId)
      log.info('[orchestrator] 第三步-保存用户消息到记忆...', {
        读取到记忆条数: memory?.length || 0,
      })
      await this.memoryService.addMessage(userId, 'user', message)
      log.info('[orchestrator] 第四步-用户消息已保存✅', { userId })
    } else {
      log.info('[orchestrator] 第二步-无 userId，跳过记忆读取', {})
    }

    const route = await this.routeWithLLM(message)
    log.info('[orchestrator] 第五步-路由结果:', {
      路由结果: route,
      根据路由类型分流执行: route.type,
    })
    let result

    switch (route.type) {
      case 'chat':
        log.info('[orchestrator] 第六步-分支: chat 对话模式', { message, memory })
        result = await this.workflowEngine.chat(message, memory)
        break

      case 'rag':
        log.info('[orchestrator] 第六步-分支: rag 知识库模式', { message })
        result = await this.workflowEngine.rag(message)
        break

      case 'tool':
        log.info('[orchestrator] 第六步-分支: tool 工具模式', { message, tools: route.tools })
        result = await this.workflowEngine.tool(message, route.tools || [])
        break

      case 'summary':
        log.info('[orchestrator] 第六步-分支: summary 摘要模式', { message })
        result = await this.workflowEngine.summary(message)
        break

      case 'agent':
        log.info('[orchestrator] 第六步-分支: agent 代理模式', { message, memory })
        result = await this.runAgentLoop(message, memory)
        break

      default:
        log.info('[orchestrator] 第六步-分支: 默认 CHAT 模式', { message, memory })
        result = await this.workflowEngine.chat(message, memory)
    }

    log.info('[orchestrator] 第七步-Workflow 执行结果:', { result })

    if (this.memoryService && userId && result?.answer) {
      await this.memoryService.addMessage(userId, 'assistant', result.answer)
      log.info('[orchestrator] 第八步-助手回复保存到记忆✅', { userId })
    }
    log.info('[orchestrator] 第九步-执行完成✅', { 返回结果: result })

    return result
  }

  private async routeWithLLM(message: string): Promise<ExtendedRouteResult> {
    log.info('[orchestrator] 第五步-开始 LLM 路由判断...', { message })

    const toolsPrompt = this.toolExecutor
      ? `\n可用工具: ${this.toolExecutor
          .listTools()
          .map((t) => t.name)
          .join(', ')}`
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

    const response = await llmProvider.invoke(prompt)
    log.info('[orchestrator] 第五步-LLM 返回:', { response })

    try {
      let jsonStr = response

      if (jsonStr.includes('```json')) {
        const startIdx = jsonStr.indexOf('```json') + 7
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          log.info('[orchestrator] 第五步-Markdown 代码块清理后的 JSON:', { jsonStr })
        }
      } else if (jsonStr.includes('```')) {
        const startIdx = jsonStr.indexOf('```') + 3
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          log.info('[orchestrator] 第五步-无标签代码块清理后的 JSON:', { jsonStr })
        }
      }

      const parsed = JSON.parse(jsonStr)
      log.info('[orchestrator] 第五步-JSON 解析成功:', {
        type: parsed.type || 'chat',
        confidence: parsed.confidence || 0.5,
        tools: parsed.tools || [],
        reason: parsed.reason,
      })
      return {
        type: parsed.type || 'chat',
        confidence: parsed.confidence || 0.5,
        tools: parsed.tools || [],
        reason: parsed.reason,
      }
    } catch (e) {
      log.info('[orchestrator] 第五步-❌ JSON 解析失败:', { error: e.message, 原始响应: response })
      return {
        type: 'chat',
        confidence: 0.3,
        reason: '解析失败，默认使用chat',
      }
    }
  }

  async runAgentLoop(message: string, memory: any) {
    const state: AgentState = {
      message,
      memory,
      steps: [],
      result: null,
    }

    for (let i = 0; i < 5; i++) {
      console.log(`[Orchestrator（Agent）] ========== Agent第${i + 1}步开始 ==========`)

      const action = await this.decideNextAction(state)
      log.info('[orchestrator] 第六步-JSON Agent动作决定:', { action })

      if (action.type === 'final') {
        log.info('[orchestrator] 第六步-JSON Agent Final 动作 动作，返回最终结果:', {
          answer: action.output,
          steps: state.steps,
        })
        return { answer: action.output, steps: state.steps }
      }

      if (action.type === 'tool' && this.toolExecutor) {
        log.info('[Orchestrator（Agent）] 第六步-JSON Agent 执行工具:', {
          tool: action.tool,
          params: action.params,
        })
        try {
          const toolResult = await this.toolExecutor.execute(action.tool, action.params)
          state.steps.push({ action, toolResult })
          state.result = toolResult
          log.info('[Orchestrator（Agent）] 第六步-JSON Agent 工具执行结果已更新:', {
            action,
            toolResult,
          })
        } catch (e) {
          console.error('[Orchestrator（Agent）] ❌ 工具执行失败:', e)
        }
      }
    }

    log.info('[Orchestrator（Agent）] 第六步-JSON Agent 循环结束，返回结果:', {
      answer: state.result,
      steps: state.steps,
    })
    return { answer: state.result, steps: state.steps }
  }

  private async decideNextAction(state: AgentState) {
    const history = state.steps.map((s) => JSON.stringify(s)).join('\n')

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

    const response = await llmProvider.invoke(prompt)
    log.info('[Orchestrator（decideNextAction）] LLM 返回:', { prompt, response })

    try {
      let jsonStr = response

      if (jsonStr.includes('```json')) {
        const startIdx = jsonStr.indexOf('```json') + 7
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          log.info('[Orchestrator（decideNextAction）]  Markdown 代码块清理后的 JSON:', { jsonStr })
        }
      } else if (jsonStr.includes('```')) {
        const startIdx = jsonStr.indexOf('```') + 3
        const endIdx = jsonStr.lastIndexOf('```')
        if (startIdx < endIdx) {
          jsonStr = jsonStr.substring(startIdx, endIdx).trim()
          log.info('[Orchestrator（decideNextAction）] 无标签代码块清理后的 JSON:', { jsonStr })
        }
      }

      const action = JSON.parse(jsonStr)
      log.info('[Orchestrator（decideNextAction）] Agent思考结果解析成功:', { action })
      return action
    } catch (e) {
      log.info('[Orchestrator（decideNextAction）] ❌ Agent思考结果解析失败:', {
        error: e.message,
        原始响应: response,
      })
      return { type: 'final', output: '处理完成' }
    }
  }

  async stream(message: string) {
    log.info('[Orchestrator（stream）] 流式输出模式', { message })
    return this.workflowEngine.stream(message)
  }
}
