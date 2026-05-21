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
      useFactory: (
        toolExecutor: DefaultToolExecutor,
        registry: AIRegistry
      ) => {
        console.log('[ai-engine.module] 初始化 WorkflowEngine...')
        console.log('[ai-engine.module] toolExecutor:', !!toolExecutor)
        console.log('[ai-engine.module] registry:', !!registry)
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
        console.log('[ai-engine.module] 初始化 Orchestrator...')
        const router = new (require('./router/intent.router').IntentRouter)()
        return new Orchestrator(
          registry,
          router,
          workflowEngine,
          memoryService,
          toolExecutor,
        )
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
        console.log('[ai-engine.module] 初始化 AIRuntime...')
        return new AIRuntime(
          registry,
          workflowEngine,
          memoryService,
          toolExecutor
        )
      },
      inject: [AIRegistry, WorkflowEngine, InMemoryMemoryService, DefaultToolExecutor],
    },
  ],
  exports: [AIRegistry, AIRuntime, Orchestrator, InMemoryMemoryService, DefaultToolExecutor],
})
export class AIEngineModule {}
