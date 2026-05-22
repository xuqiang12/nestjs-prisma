import { Module, Global } from '@nestjs/common'
import { AIRegistry } from './core/ai.registry'
import { AIRuntime } from './core/ai.runtime'
import { Orchestrator } from './core/orchestrator'
import { WorkflowEngine } from './core/workflow.engine'
import { InMemoryMemoryService } from './memory/memory.service'
import { DefaultToolExecutor } from './tools/tool.executor'
import { ragWorkflow } from './workflow/rag.workflow'
import { chatWorkflow } from './workflow/chat.workflow'

@Global()
@Module({
  providers: [
    {
      provide: AIRegistry,
      useFactory: () => {
        const registry = new AIRegistry()
        registry.registerWorkflow(ragWorkflow)
        registry.registerWorkflow(chatWorkflow)
        return registry
      },
    },
    InMemoryMemoryService,
    DefaultToolExecutor,
    {
      provide: WorkflowEngine,
      useFactory: (toolExecutor: DefaultToolExecutor, registry: AIRegistry) => {
        log.info('初始化工作流引擎', {
          工具执行器加载状态: !!toolExecutor ? '✅ 已加载' : '❌ 未加载',
          工作流注册器加载状态: !!registry ? '✅ 已加载' : '❌ 未加载',
        })
        return new WorkflowEngine(toolExecutor, registry)
      },
      inject: [DefaultToolExecutor, AIRegistry],
    },
    {
      provide: Orchestrator,
      useFactory: (
        registry: AIRegistry,
        memoryService: InMemoryMemoryService,
        toolExecutor: DefaultToolExecutor,
        workflowEngine: WorkflowEngine,
      ) => {
        log.info('初始化AI 调度中心')
        const router = new (require('./router/intent.router').IntentRouter)()
        return new Orchestrator(registry, router, workflowEngine, memoryService, toolExecutor)
      },
      inject: [AIRegistry, InMemoryMemoryService, DefaultToolExecutor, WorkflowEngine],
    },
    {
      provide: AIRuntime,
      useFactory: (
        registry: AIRegistry,
        workflowEngine: WorkflowEngine,
        memoryService: InMemoryMemoryService,
        toolExecutor: DefaultToolExecutor,
      ) => {
        log.info('初始化（AI 核心运行时）')
        return new AIRuntime(registry, workflowEngine, memoryService, toolExecutor)
      },
      inject: [AIRegistry, WorkflowEngine, InMemoryMemoryService, DefaultToolExecutor],
    },
  ],
  exports: [AIRegistry, AIRuntime, Orchestrator, InMemoryMemoryService, DefaultToolExecutor],
})
export class AIEngineModule {}
