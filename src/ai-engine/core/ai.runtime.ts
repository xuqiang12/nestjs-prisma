import { AIRegistry } from './ai.registry'
import { IntentRouter } from '../router/intent.router'
import { Orchestrator } from './orchestrator'
import { WorkflowEngine } from './workflow.engine'
import { InMemoryMemoryService } from '../memory/memory.service'
import { DefaultToolExecutor } from '../tools/tool.executor'
import { WorkflowContext } from './types'

export class AIRuntime {
  private orchestrator: Orchestrator
  private registry: AIRegistry

  constructor(
    registry: AIRegistry,
    workflowEngine: WorkflowEngine,
    memoryService: InMemoryMemoryService,
    toolExecutor: DefaultToolExecutor,
  ) {
    log.info('AI 推理管理器初始化完成✅')
    this.registry = registry
    const router = new IntentRouter()
    log.info('构造函数-Router 创建完成✅')
    this.orchestrator = new Orchestrator(
      registry,
      router,
      workflowEngine,
      memoryService,
      toolExecutor,
    )
    console.log(' 构造函数-Orchestrator 创建完成')
  }

  async run(params: {
    input: string
    sessionId?: string
    userId?: string
    metadata?: Record<string, any>
  }): Promise<any> {
    const { input, userId, metadata } = params

    try {
      const result = await this.orchestrator.execute({
        message: input,
        userId,
      })

      return {
        success: true,
        input,
        output: result,
        state: { userId, metadata },
      }
    } catch (err: any) {
      return this.handleError(err, input)
    }
  }

  private handleError(error: Error, input: string) {
    console.error('❌ 发生错误! 错误详情:', {
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
