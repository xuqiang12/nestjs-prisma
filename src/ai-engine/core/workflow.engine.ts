import { ragWorkflow } from '../workflow/rag.workflow'
import { chatWorkflow } from '../workflow/chat.workflow'
import { llmProvider } from '../models/llm.provider'
import { PROMPTS } from '../prompts'
import { DefaultToolExecutor } from '../tools/tool.executor'
import { AIRegistry } from './ai.registry'

export class WorkflowEngine {
  constructor(
    private toolExecutor?: DefaultToolExecutor,
    private registry?: AIRegistry,
  ) {
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

  async tool(message: string, toolNames: string[]) {
    console.log('========== [WorkflowEngine（tool）] DEBUG START ==========')
    console.log('[WorkflowEngine（tool）] 开始 TOOL 工作流，工具:', toolNames)
    console.log(
      '[WorkflowEngine（tool）] this.toolExecutor:',
      this.toolExecutor ? '✅ 存在' : '❌ 不存在',
    )
    console.log('[WorkflowEngine（tool）] this.registry:', this.registry ? '✅ 存在' : '❌ 不存在')

    // 如果没有可用的 ToolExecutor，降级为普通聊天
    if (!this.toolExecutor || !this.registry) {
      console.log('[WorkflowEngine（tool）] ToolExecutor 或 AIRegistry 不可用，降级为普通聊天')
      console.log('========== [WorkflowEngine（tool）] DEBUG END (降级) ==========')
      return this.chat(message)
    }

    // 获取已注册的工具列表
    const availableTools = this.registry.listTools()
    console.log(
      '[WorkflowEngine（tool）] 已注册工具:',
      availableTools.map((t) => t.name),
    )
    console.log('[WorkflowEngine（tool）] 可用工具详情:', JSON.stringify(availableTools, null, 2))

    // 让 LLM 决定用哪个工具和参数
    const toolDecisionPrompt = this.buildToolDecisionPrompt(message, availableTools)
    console.log('[WorkflowEngine（tool）] 让 LLM 决定使用哪个工具...')
    console.log('[WorkflowEngine（tool）] toolDecisionPrompt 长度:', toolDecisionPrompt.length)

    let toolCallResult: any
    try {
      // 先让 LLM 决定用什么工具
      console.log('[WorkflowEngine（tool）] 调用 LLM 进行工具决策...')
      const llmResponse = await llmProvider.invoke(toolDecisionPrompt)
      console.log('[WorkflowEngine（tool）] LLM 返回的工具决策:', llmResponse)

      // 解析 LLM 的响应，提取工具名和参数（简化版）
      console.log('[WorkflowEngine（tool）] 解析工具调用...')
      const toolCall = this.parseToolCall(llmResponse, availableTools, message)
      console.log('[WorkflowEngine（tool）] 解析结果:', toolCall)

      if (toolCall) {
        console.log(
          '[WorkflowEngine（tool）] ✅ 找到工具调用，执行工具:',
          toolCall.toolName,
          '参数:',
          toolCall.params,
        )
        toolCallResult = await this.toolExecutor.execute(toolCall.toolName, toolCall.params)
        console.log('[WorkflowEngine（tool）] 工具执行结果:', toolCallResult)
      } else {
        // 如果无法解析，默认尝试用第一个可用工具
        if (availableTools.length > 0) {
          console.log(
            '[WorkflowEngine（tool）] ❌ 无法解析，尝试使用第一个工具:',
            availableTools[0].name,
          )
          // 尝试从消息中提取 userId
          const userIdMatch = message.match(/用户[^\d]*(\d+)/)
          console.log(
            '[WorkflowEngine（tool）] 提取 userId:',
            userIdMatch ? userIdMatch[1] : '未找到',
          )
          const params = userIdMatch ? { userId: parseInt(userIdMatch[1]) } : {}
          console.log('[WorkflowEngine（tool）] 执行参数:', params)
          toolCallResult = await this.toolExecutor.execute(availableTools[0].name, params)
          console.log('[WorkflowEngine（tool）] 工具执行结果:', toolCallResult)
        } else {
          console.log('[WorkflowEngine（tool）] ❌ 没有可用工具')
        }
      }
    } catch (error) {
      console.error('[WorkflowEngine（tool）] ❌ 工具调用失败:', error)
      console.error('[WorkflowEngine（tool）] 错误栈:', (error as Error).stack)
      toolCallResult = { success: false, error: String(error) }
    }

    // 生成最终回答
    console.log('[WorkflowEngine（tool）] 生成最终回答...')
    const finalAnswerPrompt = this.buildFinalAnswerPrompt(message, toolCallResult)
    const finalAnswer = await llmProvider.invoke(finalAnswerPrompt)

    console.log('========== [WorkflowEngine（tool）] DEBUG END ==========')
    return {
      answer: finalAnswer,
      tools: toolNames,
      toolResult: toolCallResult,
    }
  }

  /**
   * 构建工具决策的 Prompt
   */
  private buildToolDecisionPrompt(message: string, availableTools: any[]) {
    const toolsDescription = availableTools
      .map((tool) => `- ${tool.name}: ${tool.description}\n  参数: ${JSON.stringify(tool.params)}`)
      .join('\n')

    return `
你是一个工具调用助手。

用户问题: ${message}

可用工具:
${toolsDescription}

请分析用户问题，决定使用哪个工具，并提取工具需要的参数。

返回格式（JSON）:
{
  "toolName": "工具名称",
  "params": { "参数名": "参数值" }
}

只返回 JSON，不要有其他文字！
`
  }

  /**
   * 解析工具调用
   */
  private parseToolCall(llmResponse: string, availableTools: any[], originalMessage: string) {
    try {
      // 尝试提取 JSON
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.toolName && parsed.params) {
          // 验证工具是否存在
          const toolExists = availableTools.some((t) => t.name === parsed.toolName)
          if (toolExists) {
            return parsed
          }
        }
      }
    } catch (e) {
      console.error('[WorkflowEngine（tool）] 解析工具调用失败:', e)
    }

    // 降级方案：尝试从消息中提取信息
    const userIdMatch = originalMessage.match(/用户[^\d]*(\d+)/)
    if (userIdMatch) {
      const userMenuTool = availableTools.find((t) => t.name === 'get_user_menu_permissions')
      if (userMenuTool) {
        return {
          toolName: 'get_user_menu_permissions',
          params: { userId: parseInt(userIdMatch[1]) },
        }
      }
    }

    return null
  }

  /**
   * 构建最终回答的 Prompt
   */
  private buildFinalAnswerPrompt(message: string, toolResult: any) {
    return `
用户问题: ${message}

工具执行结果:
${JSON.stringify(toolResult, null, 2)}

请根据工具执行结果，给用户一个友好的回答。
`
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

// 删除全局实例，只使用 NestJS DI 容器
// export const workflowEngine = new WorkflowEngine()
