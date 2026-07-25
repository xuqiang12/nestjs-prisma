import { Global, Module } from '@nestjs/common'
import { AIRegistry } from './core/ai.registry'
import { EmbeddingService } from './embedding/embedding.service'
import { InMemoryMemoryService } from './memory/memory.service'
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service'
import { DefaultToolExecutor } from './tools/tool.executor'
import { LlmService } from './llm/llm.service'
import { VectorStoreService } from './vector/vector-store.service'
import { AgentRuntimeService } from './agent/agent-runtime.service'
import { PromptRendererService } from './prompt/prompt-renderer.service'
import { SensitiveWordCheckerService } from './safety/sensitive-word-checker.service'
import { WorkflowExecutorService } from './workflow/workflow-executor.service'
import { WorkflowRunLoggerService } from './workflow/workflow-run-logger.service'
import { WorkflowRuntimeService } from './workflow/workflow-runtime.service'
import { WorkflowValidatorService } from './workflow/workflow-validator.service'

@Global()
@Module({
  providers: [
    LlmService,
    EmbeddingService,
    VectorStoreService,
    AgentRuntimeService,
    PromptRendererService,
    SensitiveWordCheckerService,
    WorkflowValidatorService,
    WorkflowRuntimeService,
    WorkflowExecutorService,
    WorkflowRunLoggerService,
    AiOrchestratorService,
    {
      provide: AIRegistry,
      useFactory: () => new AIRegistry(),
    },
    InMemoryMemoryService,
    DefaultToolExecutor,
  ],
  exports: [
    AIRegistry,
    InMemoryMemoryService,
    DefaultToolExecutor,
    LlmService,
    EmbeddingService,
    VectorStoreService,
    AiOrchestratorService,
    AgentRuntimeService,
    PromptRendererService,
    SensitiveWordCheckerService,
    WorkflowValidatorService,
    WorkflowRuntimeService,
    WorkflowExecutorService,
    WorkflowRunLoggerService,
  ],
})
export class AIEngineModule {}
