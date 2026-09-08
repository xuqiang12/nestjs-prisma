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
import { BuiltinToolAdapter } from './tools/adapters/builtin-tool.adapter'
import { McpToolAdapter } from './tools/adapters/mcp-tool.adapter'
import { RestToolAdapter } from './tools/adapters/rest-tool.adapter'
import { BUILTIN_TOOL_MAP, DefaultToolExecutor, TOOL_SOURCE_ADAPTERS } from './tools/default-tool.executor'
import { RuntimeToolRegistry } from './tools/runtime-tool-registry.service'
import { BuiltinTool, ToolSourceAdapter } from './tools/tool.types'
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
        const builtinTools: BuiltinTool[] = [
          searchKnowledgeTool,
          getUserMenuPermissionsTool,
        ]
        const registry = new RuntimeToolRegistry()
        registry.registerTools(builtinTools.map((tool) => tool.definition))
        return registry
      },
      inject: [SearchKnowledgeTool, GetUserMenuPermissionsTool],
    },
    {
      provide: BUILTIN_TOOL_MAP,
      useFactory: (
        searchKnowledgeTool: SearchKnowledgeTool,
        getUserMenuPermissionsTool: GetUserMenuPermissionsTool,
      ) => new Map<string, BuiltinTool>([
        [searchKnowledgeTool.definition.code, searchKnowledgeTool],
        [getUserMenuPermissionsTool.definition.code, getUserMenuPermissionsTool],
      ]),
      inject: [SearchKnowledgeTool, GetUserMenuPermissionsTool],
    },
    {
      provide: RestToolAdapter,
      // 创建 REST 工具适配器，避免 Nest 注入接口类型的 HTTP Client。
      useFactory: () => new RestToolAdapter(),
    },
    {
      provide: McpToolAdapter,
      useFactory: () => new McpToolAdapter({
        callTool: async () => {
          throw new Error('MCP Client 未配置')
        },
      }),
    },
    {
      provide: TOOL_SOURCE_ADAPTERS,
      useFactory: (
        builtinToolMap: ReadonlyMap<string, BuiltinTool>,
        restToolAdapter: RestToolAdapter,
        mcpToolAdapter: McpToolAdapter,
      ): ToolSourceAdapter[] => [
        new BuiltinToolAdapter(builtinToolMap),
        restToolAdapter,
        mcpToolAdapter,
      ],
      inject: [BUILTIN_TOOL_MAP, RestToolAdapter, McpToolAdapter],
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
