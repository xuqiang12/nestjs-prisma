import { Global, Module } from '@nestjs/common'
import { AIRegistry } from './core/ai.registry'
import { EmbeddingService } from './embedding/embedding.service'
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service'
import { DefaultToolExecutor } from './tools/tool.executor'
import { LlmService } from './llm/llm.service'
import { VectorStoreService } from './vector/vector-store.service'
import { AgentExecutionLoggerService } from './agent/agent-execution-logger.service'
import { AgentExecutorService } from './agent/agent-executor.service'
import { AgentPlanService } from './agent/agent-plan.service'
import { AgentResponseComposerService } from './agent/agent-response-composer.service'
import { AgentRuntimeService } from './agent/agent-runtime.service'
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
    AgentExecutionLoggerService,
    AgentExecutorService,
    AgentPlanService,
    AgentResponseComposerService,
    AgentRuntimeService,
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
    DefaultToolExecutor,
  ],
  exports: [
    AIRegistry,
    DefaultToolExecutor,
    LlmService,
    EmbeddingService,
    VectorStoreService,
    AiOrchestratorService,
    AgentExecutionLoggerService,
    AgentExecutorService,
    AgentPlanService,
    AgentResponseComposerService,
    AgentRuntimeService,
    SensitiveWordCheckerService,
    WorkflowValidatorService,
    WorkflowRuntimeService,
    WorkflowExecutorService,
    WorkflowRunLoggerService,
  ],
})
export class AIEngineModule {}
