// 注册 AI 引擎通用能力服务。
import { Global, Module } from '@nestjs/common'
import { AIRegistry } from './core/ai.registry'
import { EmbeddingService } from './embedding/embedding.service'
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service'
import { DefaultToolExecutor } from './tools/tool.executor'
import { KnowledgeAnswerGuardService } from './knowledge-qa/knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from './knowledge-qa/knowledge-evidence.service'
import { KnowledgeQAService } from './knowledge-qa/knowledge-qa.service'
import { LlmService } from './llm/llm.service'
import { ModelResolverService } from './model/model-resolver.service'
import { VectorStoreService } from './vector/vector-store.service'
import { SensitiveWordCheckerService } from './safety/sensitive-word-checker.service'
import { WorkflowExecutorService } from './workflow/workflow-executor.service'
import { WorkflowRunLoggerService } from './workflow/workflow-run-logger.service'
import { WorkflowRuntimeService } from './workflow/workflow-runtime.service'
import { WorkflowValidatorService } from './workflow/workflow-validator.service'

@Global()
@Module({
  providers: [
    LlmService,
    ModelResolverService,
    EmbeddingService,
    VectorStoreService,
    SensitiveWordCheckerService,
    WorkflowValidatorService,
    WorkflowRuntimeService,
    WorkflowExecutorService,
    WorkflowRunLoggerService,
    KnowledgeAnswerGuardService,
    KnowledgeEvidenceService,
    KnowledgeQAService,
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
    ModelResolverService,
    EmbeddingService,
    VectorStoreService,
    AiOrchestratorService,
    SensitiveWordCheckerService,
    WorkflowValidatorService,
    WorkflowRuntimeService,
    WorkflowExecutorService,
    WorkflowRunLoggerService,
    KnowledgeAnswerGuardService,
    KnowledgeEvidenceService,
    KnowledgeQAService,
  ],
})
export class AIEngineModule {}
