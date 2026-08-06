// 注册新版 AI 运行时底层能力和运行时工具。
import { Global, Module } from '@nestjs/common'
import { EmbeddingService } from './embedding/embedding.service'
import { KnowledgeAnswerGuardService } from './knowledge/knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from './knowledge/knowledge-evidence.service'
import { KnowledgeQAService } from './knowledge/knowledge-qa.service'
import { LlmService } from './llm/llm.service'
import { ModelResolverService } from './model/model-resolver.service'
import { SensitiveWordCheckerService } from './safety/sensitive-word-checker.service'
import { GetUserMenuPermissionsTool } from './tools/builtin/get-user-menu-permissions.tool'
import { SearchKnowledgeTool } from './tools/builtin/search-knowledge.tool'
import { DefaultToolExecutor } from './tools/default-tool.executor'
import { RuntimeToolRegistry } from './tools/runtime-tool-registry.service'
import { VectorStoreService } from './vector/vector-store.service'
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
    SearchKnowledgeTool,
    GetUserMenuPermissionsTool,
    {
      provide: RuntimeToolRegistry,
      useFactory: (
        searchKnowledgeTool: SearchKnowledgeTool,
        getUserMenuPermissionsTool: GetUserMenuPermissionsTool,
      ) => {
        const registry = new RuntimeToolRegistry()
        registry.registerTools([
          searchKnowledgeTool.getToolDefinition(),
          getUserMenuPermissionsTool.getToolDefinition(),
        ])
        return registry
      },
      inject: [SearchKnowledgeTool, GetUserMenuPermissionsTool],
    },
    DefaultToolExecutor,
  ],
  exports: [
    RuntimeToolRegistry,
    DefaultToolExecutor,
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
    SearchKnowledgeTool,
    GetUserMenuPermissionsTool,
  ],
})
export class AiRuntimeModule {}
