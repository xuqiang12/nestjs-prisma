import { AIRegistry } from './ai.registry'
import { IntentRouter } from '../router/intent.router'
import { Orchestrator } from './orchestrator'
import { workflowEngine } from './workflow.engine'
import { memoryService } from '../memory/memory.service'
import { toolExecutor } from '../tools/tool.executor'
import { WorkflowContext } from './types'

export class AIRuntime {
  private orchestrator: Orchestrator
  private registry: AIRegistry

  constructor(registry: AIRegistry) {
    console.log('[AIRuntime（ai-runtime）] 构造函数-初始化...')
    this.registry = registry
    const router = new IntentRouter()
    console.log('[AIRuntime（ai-runtime）] 构造函数-Router 创建完成')
    this.orchestrator = new Orchestrator(
      registry,
      router,
      workflowEngine,
      memoryService,
      toolExecutor,
    )
    console.log('[AIRuntime（ai-runtime）] 构造函数-Orchestrator 创建完成')
    console.log('[AIRuntime（ai-runtime）] 构造函数-初始化完成✅')
  }

  async run(params: {
    input: string
    sessionId?: string
    userId?: string
    metadata?: Record<string, any>
  }): Promise<any> {
    const { input, userId, metadata } = params

    console.log('═══════════════════════════════════════════════════════════')
    console.log('[AIRuntime（ai-runtime）] 第一步-开始处理请求:', { input, userId })
    console.log('═══════════════════════════════════════════════════════════')

    try {
      console.log('[AIRuntime（ai-runtime）] 第二步-调用 Orchestrator.execute()')
      const result = await this.orchestrator.execute({
        message: input,
        userId,
      })
      console.log('[AIRuntime（ai-runtime）] 第三步-Orchestrator 返回结果:', result)

      console.log('═══════════════════════════════════════════════════════════')
      console.log('[AIRuntime（ai-runtime）] 第四步-请求处理完成✅')
      console.log('═══════════════════════════════════════════════════════════')

      return {
        success: true,
        input,
        output: result,
        state: { userId, metadata },
      }
    } catch (err: any) {
      console.log('[AIRuntime（ai-runtime）] ❌ 发生错误!')
      return this.handleError(err, input)
    }
  }

  private handleError(error: Error, input: string) {
    console.error('[AIRuntime] 错误详情:', {
      message: error.message,
      stack: error.stack,
    })
    return {
      success: false,
      input,
      error: {
        message: error.message,
        stack: error.stack,
      },
    }
  }
}
