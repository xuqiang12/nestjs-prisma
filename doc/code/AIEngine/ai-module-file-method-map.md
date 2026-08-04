# AI 模块文件与方法说明

> 当前文档基于后端 `nestjs-prisma` 的 AI 相关源码整理，范围为：
>
> - `src/ai-engine/**`
> - `src/modules/ai-platform/**`
> - `src/modules/knowledge-bot/**`
>
> 不展开测试文件。DTO 文件没有业务方法，按字段职责说明。

## 1. 总体分层

当前 AI 后端可以分成三层：

| 层级 | 目录 | 职责 |
| --- | --- | --- |
| AI 引擎层 | `src/ai-engine` | LLM、Embedding、Vector、Agent Runtime、Workflow Runtime、Tool Registry、安全检查等底层能力。 |
| AI 配置后台 | `src/modules/ai-platform` | Prompt、Agent、SensitiveWord、Workflow、Tool、SkillPackage、WorkflowRun 等配置接口。 |
| 聊天与知识库入口 | `src/modules/knowledge-bot` | 用户聊天入口、会话保存、知识库管理、知识工具注册。 |

当前重构目标下，核心运行链路是：

```text
ChatController
  -> ChatService
  -> SensitiveWordCheckerService(input)
  -> AgentRuntimeService
  -> AgentPlannerService
  -> AgentPlanValidatorService
  -> AgentExecutorService
  -> AgentResponseComposerService
  -> SensitiveWordCheckerService(output)
  -> ConversationService
  -> AgentExecutionLoggerService
```

## 2. 清理判断摘要

| 模块 | 当前判断 | 原因 |
| --- | --- | --- |
| `agent/**` | 保留 | 新的最小 Agent Runtime 主链，职责清晰。 |
| `workflow/**` | 保留 | 工作流配置和运行独立于 Agent，且运行日志有实际排查价值。 |
| `orchestrator/**` | 保留，但未来可改名 | 当前不是旧 Agent Router，而是 LLM/RAG completion builder。 |
| `knowledge-base/**` | 保留 | 新知识库模型，包含知识库、文件、chunk、embedding、检索测试。 |
| `knowledge/**` | 建议标记 legacy，后续迁移后删除 | 旧 chunk 级知识 API，与 `knowledge-base` 形成双入口。 |
| `memory/**` | 高概率删除 | 当前没有业务链路调用，容易误导为已支持长期记忆。 |
| `core/types.ts` | 高概率删除 | `RouteResult` 等旧路由概念残留，当前正式 workflow 类型在 `workflow.types.ts`。 |
| `core/interfaces.ts` | 建议收窄 | `ToolExecutor/ToolDefinition` 有用，`MemoryService/ExtendedRouteResult/AgentState` 偏旧。 |
| `skill-package/**` | 暂时保留 | 当前是 Agent 配置模板，不是 AgentCapability 换皮。是否长期保留取决于业务是否需要模板安装。 |

## 3. `src/ai-engine` 文件说明

### 3.1 `src/ai-engine/ai-engine.module.ts`

**定位**

全局 AI 引擎模块，负责把 AI 底层服务注册到 NestJS DI 容器中。

**主要内容**

| 内容 | 说明 |
| --- | --- |
| `@Global()` | 表示该模块 provider 可被其他模块直接注入。 |
| `providers` | 注册 LLM、Embedding、Vector、Agent、Workflow、Tool、SensitiveWord 等服务。 |
| `exports` | 对外导出这些服务，供 `knowledge-bot`、`ai-platform` 等模块使用。 |
| `AIRegistry useFactory` | 创建全局工具注册中心实例。 |

**保留建议**

保留。它是后端 AI 能力的 DI 汇总入口。后续删除 memory 或旧接口时，需要同步从这里移除 provider/export。

---

### 3.2 `src/ai-engine/llm/llm.service.ts`

**定位**

大模型调用封装。当前主要面向 SiliconFlow/OpenAI 兼容接口。

**类型**

| 类型 | 说明 |
| --- | --- |
| `ChatMessage` | 模型消息结构，包含 `role` 和 `content`。 |
| `LlmOptions` | 模型调用参数，如 `model`、`temperature`、`topP`、`finalAnswerGuard`、`roleTemplateStops`。 |

**方法**

| 方法 | 作用 |
| --- | --- |
| `invoke(prompt: string)` | 旧/简化调用方式，把纯字符串作为用户消息调用模型。 |
| `invokeWithMessages(messages, options?)` | 非流式模型调用。接收完整 messages，组装请求体，调用模型接口，返回最终文本。 |
| `stream(prompt: string)` | 旧/简化流式调用方式，把纯字符串作为用户消息流式输出。 |
| `streamWithMessages(messages, options?)` | 流式模型调用。解析 SSE/流式响应，逐段 yield 文本片段。 |
| `buildMessages(prompt)` | 把纯 prompt 包装成标准 messages。 |
| `buildRequestBody(messages, options?)` | 根据模型参数构造请求体。 |
| `withFinalAnswerGuard(messages, options?)` | 根据参数追加最终回答约束，降低模型输出角色标签、复制上下文等问题。 |
| `sanitizeOutput(content, options?)` | 清洗模型输出，配合 final answer guard 去掉不应暴露的角色模板或异常片段。 |

**保留建议**

保留。未来如果支持多模型供应商，建议把 provider 逻辑拆到 `model` 或 `provider` 目录。

---

### 3.3 `src/ai-engine/embedding/embedding.service.ts`

**定位**

文本向量生成服务，用于知识入库和向量检索。

**类型**

| 类型 | 说明 |
| --- | --- |
| `EmbeddingConfig` | embedding 接口配置，包括 endpoint、model、apiKeyRef。 |

**方法**

| 方法 | 作用 |
| --- | --- |
| `createEmbedding(text, config?)` | 调用 embedding 接口生成向量。默认读取环境变量中的模型和 Key，也可接收知识库级配置。 |

**保留建议**

保留。它是 `VectorStoreService` 的基础依赖。

---

### 3.4 `src/ai-engine/vector/vector-store.service.ts`

**定位**

向量库服务，负责 `documents` 表的写入、更新、删除、分页和相似度检索。

**类型**

| 类型 | 说明 |
| --- | --- |
| `SearchResult` | 相似度检索结果，包含 id、content、metadata、distance 等。 |
| `AddDocumentsResult` | 文档入库结果，通常包含写入 chunk 数。 |
| `KnowledgeDocumentListItem` | 知识 chunk 列表项结构。 |

**方法**

| 方法 | 作用 |
| --- | --- |
| `addDocuments(contents, metadata?, options?)` | 将一组文本切片、生成 embedding，并写入 `documents`。支持知识库 ID、文件 ID、chunk 配置、embedding 配置。 |
| `similaritySearch(query, limit?, options?)` | 根据 query 生成向量，通过 pgvector `<=>` 查相似 chunk。支持 tags 和 knowledgeBaseIds 过滤。 |
| `list(pageNum, pageSize, query?)` | 分页查询 `documents`，用于旧知识列表和新知识库 chunk 列表。 |
| `deleteById(id)` | 删除指定 chunk。 |
| `revectorById(id)` | 重新生成指定 chunk 的 embedding。 |
| `updateContent(id, content)` | 修改 chunk 内容并重新生成 embedding。 |
| `buildMetadata(metadata, index, chunk, options?)` | 组装 chunk metadata，如文件名、source、chunkIndex 等。 |
| `normalizeVector(vector)` | 把 embedding 数组转换成 pgvector 可写入格式。 |
| `normalizeSearchResult(row)` | 把数据库 raw result 转成统一的 `SearchResult`。 |

**保留建议**

保留。它是 RAG 和知识库管理的核心基础设施。

---

### 3.5 `src/ai-engine/infra/text-chunker.ts`

**定位**

文本切片工具。

**方法**

| 方法 | 作用 |
| --- | --- |
| `splitText(text, options?)` | 按 chunkSize/chunkOverlap 把长文本拆成多个 chunk，并记录 chunkIndex、charStart、charEnd、tokenCount 等信息。 |
| `normalizeOptions(options?)` | 合并默认切片参数。 |
| `estimateTokenCount(text)` | 粗略估算 token 数，用于 chunk 元数据。 |

**保留建议**

保留。它是知识库文件入库的基础工具。

---

### 3.6 `src/ai-engine/knowledge-answer.util.ts`

**定位**

知识库答案事实校验工具，主要防止模型在数字、金额、期限、比例等信息上编造。

**类型**

| 类型 | 说明 |
| --- | --- |
| `KnowledgeAnswerFact` | 知识事实单元，包含事实文本和必须保留的关键术语。 |

**方法**

| 方法 | 作用 |
| --- | --- |
| `extractKnowledgeNumberTerms(content)` | 从文本中提取数字、金额、期限等关键术语。 |
| `validateKnowledgeAnswer(answer, facts)` | 校验回答里的数字/关键术语是否能被知识事实支撑。 |
| `buildKnowledgeFallbackAnswer(facts, question?, fallback?)` | 当模型回答不可信时，用检索事实构造兜底回答。 |
| `flattenKnowledgeFactLines(facts)` | 内部方法，把 facts 拍平成去重后的事实行。 |
| `normalizeKnowledgeTerm(content)` | 内部方法，规范化关键术语，降低格式差异影响。 |

**保留建议**

强烈保留。ToB 知识库对数字、合同条款、制度条件敏感，这层校验很有价值。

---

### 3.7 `src/ai-engine/safety/sensitive-word-checker.service.ts`

**定位**

输入/输出敏感词检查。

**类型**

| 类型 | 说明 |
| --- | --- |
| `SensitiveWordScope` | `input` 或 `output`。 |
| `SensitiveWordHit` | 命中的敏感词信息。 |

**方法**

| 方法 | 作用 |
| --- | --- |
| `checkAndApply(content, scope)` | 查询启用敏感词，按 scope 检查文本，并根据 action 执行 block、replace、record。 |
| `matchWords(content, scope)` | 内部方法，匹配当前文本命中的敏感词。 |
| `applyReplace(content, hits)` | 内部方法，把 replace 类型敏感词替换为指定文本。 |

**保留建议**

保留。它位于聊天输入保存前和输出保存前，是安全边界。

---

### 3.8 `src/ai-engine/core/ai.registry.ts`

**定位**

AI 工具注册中心。

**方法**

| 方法 | 作用 |
| --- | --- |
| `registerTool(tool)` | 注册一个工具定义。 |
| `getTool(name)` | 按工具名读取工具定义。 |
| `listTools()` | 返回全部工具定义。 |
| `getToolNames()` | 返回全部工具名，用于 Agent/SkillPackage 工具授权校验。 |
| `clear()` | 清空注册表，主要用于测试或重新初始化。 |

**保留建议**

保留。它是工具列表、工具执行、Agent 工具授权的唯一来源。

---

### 3.9 `src/ai-engine/core/interfaces.ts`

**定位**

历史基础接口集合。

**内容**

| 接口 | 说明 |
| --- | --- |
| `MemoryService` | 短期记忆接口，当前没有真实业务调用。 |
| `ToolExecutor` | 工具执行器接口，当前 `DefaultToolExecutor` 仍依赖。 |
| `ToolDefinition` | 工具定义，包含 name、description、params、handler。 |
| `ExtendedRouteResult` | 旧路由结果概念，包含 type/confidence/reason/tools。 |
| `AgentState` | 旧 Agent 状态草稿，包含 message、memory、steps、result。 |

**清理建议**

建议收窄：保留 `ToolExecutor`、`ToolDefinition`；删除 `MemoryService`、`ExtendedRouteResult`、`AgentState`，或迁移到更准确的文件名。

---

### 3.10 `src/ai-engine/core/types.ts`

**定位**

旧基础 workflow/route 类型文件。

**内容**

| 类型 | 说明 |
| --- | --- |
| `WorkflowContext` | 旧工作流上下文结构。 |
| `Workflow` | 旧 workflow 接口，只有 `run(context)`。 |
| `RouteResult` | 旧路由结果，包含 workflow/confidence/reason。 |

**清理建议**

高概率删除。当前正式工作流类型在 `src/ai-engine/workflow/workflow.types.ts`，当前 Agent Runtime 也不使用这里的 `RouteResult`。

---

### 3.11 `src/ai-engine/memory/memory.service.ts`

**定位**

内存型短期记忆服务。

**方法**

| 方法 | 作用 |
| --- | --- |
| `getShortMemory(userId)` | 读取用户最近 10 条内存消息。 |
| `addMessage(userId, role, content)` | 向用户内存追加一条消息，超过 50 条移除最早记录。 |
| `clearMemory(userId)` | 清空指定用户内存。 |

**清理建议**

建议删除。当前聊天上下文已经由 `AiConversation/AiMessage` 提供，该文件没有业务链路调用，保留 `memory` 命名容易让人误以为已支持长期记忆。

---

### 3.12 `src/ai-engine/tools/tool.executor.ts`

**定位**

默认工具执行器，基于 `AIRegistry` 执行工具。

**方法**

| 方法 | 作用 |
| --- | --- |
| `registerTool(name, definition)` | 兼容旧注册方式，实际写入 `AIRegistry`。 |
| `listTools()` | 从 `AIRegistry` 返回当前可用工具。 |
| `execute(toolName, params)` | 查找工具 handler 并执行。找不到时抛错。 |
| `toolExecutor.execute/listTools/registerTool` | 旧全局导出，当前提示弃用，应通过 DI 注入 `DefaultToolExecutor`。 |

**保留建议**

保留 `DefaultToolExecutor`。旧全局 `toolExecutor` 可以后续单独清理。

---

## 4. Agent Runtime 文件说明

### 4.1 `src/ai-engine/agent/agent-runtime.types.ts`

**定位**

Agent Runtime 的核心合同文件。

**主要类型**

| 类型 | 说明 |
| --- | --- |
| `AgentPlanStepType` | 允许的步骤类型：`chat`、`knowledge`、`tool`、`workflow`。 |
| `AgentContext` | Runtime 可信上下文，包含 Agent、模型、提示词、知识库、工具、工作流、用户、会话、最大步数。 |
| `AgentPlan` | 执行计划，包含目标和步骤列表。 |
| `AgentPlanStep` | 单个步骤，包含 type/action/target/params。 |
| `AgentRuntimeInput` | Runtime 入参，来自 ChatService，包含消息、用户、历史、会话、Agent 配置等。 |
| `AgentExecutionResult` | 非流式执行结果。 |
| `AgentRuntimeStreamEvent` | Runtime 流式事件。 |
| `AgentRuntimeStreamResult` | 流式结束时的完整状态。 |
| `AgentRuntimeStreamChunk` | Runtime 流式 chunk，包含 event 和可选 state。 |
| `AgentRuntimeConfig` | `resolve(agentCode)` 解析出的 Agent 配置。 |
| `ExecutionLogger` | 轻量执行日志接口，包含 start/success/failed。 |

**保留建议**

保留。它是防止 runtime 再次变厚、变散的合同边界。

---

### 4.2 `src/ai-engine/agent/agent-runtime.service.ts`

**定位**

Agent 后端运行时入口。它不直接实现 RAG/工具/工作流，而是串起 planner、validator、executor、composer、logger。

**方法**

| 方法 | 作用 |
| --- | --- |
| `resolve(agentCode?)` | 根据 `agentCode` 查询启用的 `AiAgent`，加载 prompt、模型参数、知识库绑定、工具白名单、workflowCode，返回 `AgentRuntimeConfig`。未传 agentCode 返回 `null`。 |
| `execute(input)` | 非流式执行 Agent。构建上下文、生成计划、写开始日志、校验计划、执行首个 step、生成最终答复、写成功/失败日志。 |
| `stream(input)` | 流式执行 Agent。工作流分支透传 workflow event；chat/knowledge 分支按 completion plan 流式输出；最后 yield sources 和 state。 |
| `buildContext(input)` | 根据请求和解析出的 Agent 配置构建 `AgentContext`。这是 Validator 信任的能力来源。 |
| `normalizeStringArray(value)` | 把 Prisma Json 转成字符串数组，用于 `knowledgeTags` 等字段。 |
| `normalizeToolCodes(value)` | 把 Prisma Json 转成工具 code 数组。 |

**关键边界**

- 它是 Agent runtime 入口，但不直接写复杂执行逻辑。
- 它会记录 `AiAgentExecutionLog`，但只记录请求级摘要，不记录 step 明细。
- `knowledgeEnabled=true` 时 runtime mode 会归到 `knowledge`。

**保留建议**

保留。当前可以进一步瘦身的方向是把 `stream()` 内部分支拆小，但不建议拆出多层目录。

---

### 4.3 `src/ai-engine/agent/agent-planner.service.ts`

**定位**

规则主导 Planner。

**方法**

| 方法 | 作用 |
| --- | --- |
| `createPlan(input, context)` | 根据请求和上下文生成 `AgentPlan`，当前只生成一个 step，并限制最大 3 步。 |
| `createStep(input, context)` | 按优先级选择步骤：workflow 绑定优先，其次 requestedToolCode，其次 knowledge，最后 chat。 |

**关键边界**

- 当前不调用 LLM 自由生成计划。
- LLM 不能决定任意工具或工作流调用。

**保留建议**

保留。后续如果要加入 LLM 辅助意图识别，应仍保持 Validator 只信任 AgentContext。

---

### 4.4 `src/ai-engine/agent/agent-plan-validator.service.ts`

**定位**

Agent 计划校验器。

**方法**

| 方法 | 作用 |
| --- | --- |
| `validate(plan, context)` | 校验计划不能为空、不能超过 maxSteps，并逐个校验 step。 |
| `validateStep(step, context)` | 校验 step 类型、知识库是否启用、是否授权 `search_knowledge`、工具是否在白名单、workflow 是否绑定。 |

**保留建议**

保留。它是防止 Agent 执行未授权能力的核心边界。

---

### 4.5 `src/ai-engine/agent/agent-executor.service.ts`

**定位**

Agent step 执行器，复用现有基础能力。

**方法**

| 方法 | 作用 |
| --- | --- |
| `execute(step, input, context)` | 执行单个 step。workflow 调 `WorkflowRuntimeService.execute`，tool 调 `DefaultToolExecutor`，chat/knowledge 调 `AiOrchestratorService.buildCompletion`。 |
| `executeTool(toolCode, params)` | 通过默认工具执行器执行工具。 |
| `streamWorkflow(step, input, context)` | 调用 `WorkflowRuntimeService.stream` 执行工作流流式分支。 |

**保留建议**

保留。它让 runtime 不直接依赖具体 RAG/Tool/Workflow 实现。

---

### 4.6 `src/ai-engine/agent/agent-response-composer.service.ts`

**定位**

最终回答组合器。

**方法**

| 方法 | 作用 |
| --- | --- |
| `compose(input, context, result)` | 根据执行结果生成最终回答。chat/knowledge 走 completion plan；workflow/tool 会把执行结果交给 LLM 总结为自然语言。 |
| `streamCompletion(messages, options?)` | 代理调用 `AiOrchestratorService.streamCompletion`。 |
| `ensureKnowledgeAnswer(content, facts, question)` | 代理知识答案校验。 |
| `composeFromExecution(input, context, output, sources)` | 将 workflow/tool 的结构化结果包装成 LLM messages，再生成最终自然语言。 |

**保留建议**

保留。它避免 Executor 同时承担执行和总结职责。

---

### 4.7 `src/ai-engine/agent/agent-execution-logger.service.ts`

**定位**

轻量 Agent 执行日志服务，对应 `AiAgentExecutionLog`。

**方法**

| 方法 | 作用 |
| --- | --- |
| `logStart(input)` | 创建 running 日志，保存 conversationId、messageId、agentCode、planJson、startedAt。 |
| `logSuccess(id, result)` | 更新日志为 success，保存 route、durationMs、finishedAt。 |
| `logFailed(id, error)` | 更新日志为 failed，保存 errorMessage、durationMs、finishedAt。 |

**保留建议**

保留。当前只做请求级摘要，符合轻量日志目标。

---

## 5. Orchestrator 文件说明

### `src/ai-engine/orchestrator/ai-orchestrator.service.ts`

**定位**

LLM/RAG completion builder。虽然名字叫 orchestrator，但当前不是旧 Agent Router。

**类型**

| 类型 | 说明 |
| --- | --- |
| `ChatMode` | `chat` 或 `knowledge`。 |
| `CompletionPlan` | LLM 调用计划，包含 route、messages、sources、knowledgeFacts、directAnswer。 |
| `KnowledgeFact` | 知识事实单元。 |
| `BuildCompletionOptions` | 构建 completion 时的选项，如 systemPrompt、allowedToolCodes、knowledgeStrict、knowledgeTags、knowledgeBaseIds。 |

**方法**

| 方法 | 作用 |
| --- | --- |
| `chat(message)` | 简单普通聊天入口，构建 chat completion 并调用 LLM。 |
| `stream(message)` | 简单普通聊天流式入口。 |
| `rag(message)` | 简单知识库问答入口，构建 knowledge completion，调用 LLM，并做知识答案校验。 |
| `buildCompletion(message, mode, history, options)` | 核心方法。chat 模式构建普通 messages；knowledge 模式先检索知识，再构建带事实依据的 system prompt。 |
| `complete(messages, options?)` | 调用 LLM 非流式接口，并附加 final answer guard。 |
| `streamCompletion(messages, options?)` | 调用 LLM 流式接口，并附加 final answer guard。 |
| `sanitizeKnowledgeAnswer(content)` | 清洗知识回答里的异常字符和复制的知识片段。 |
| `ensureKnowledgeAnswer(content, facts, question?)` | 校验知识回答，不可信时返回事实兜底回答。 |
| `withFinalAnswerOptions(options?)` | 给 LLM options 增加最终回答保护参数。 |
| `normalizeHistory(history)` | 只保留 user/assistant 历史，过滤 system 等不合适角色。 |
| `buildStandaloneKnowledgeQuestion(message, history)` | 用最近用户问题补全当前追问，提高检索命中率。 |
| `buildKnowledgeEvidence(facts)` | 把知识事实整理成 system prompt 可用的事实依据。 |
| `buildKnowledgeFacts(sources)` | 从检索结果中提取事实单元。 |
| `compactKnowledgeContent(content)` | 清洗知识 chunk，去空行、去角色标记。 |
| `splitKnowledgeFactTexts(content)` | 按句号/分号切分事实片段。 |
| `extractRequiredTerms(content)` | 抽取事实里的数字/金额/期限关键术语。 |
| `stripCopiedKnowledgeArtifacts(content)` | 删除模型回答里复制出的知识片段、事实依据、来源等附加内容。 |
| `ensureToolAllowed(toolCode, allowedToolCodes?)` | knowledge 模式要求 `search_knowledge` 被授权。 |

**保留建议**

保留。未来可改名为 `completion.service.ts` 或 `rag-completion.service.ts`，但现在不建议为了名字大改。

---

## 6. Workflow Runtime 文件说明

### 6.1 `src/ai-engine/workflow/workflow.types.ts`

**定位**

工作流正式类型定义。

**主要类型**

| 类型 | 说明 |
| --- | --- |
| `WORKFLOW_NODE_TYPES` | 允许节点类型：start、prompt、knowledge、llm、tool、condition、output。 |
| `WorkflowNodeType` | 节点类型联合类型。 |
| `WorkflowNodeConfig` | 节点配置 JSON。 |
| `WorkflowNode` | 工作流节点结构。 |
| `WorkflowEdge` | 工作流边结构。 |
| `WorkflowGraph` | 节点和边组成的图。 |
| `WorkflowExecutionInput` | 工作流执行入参，包含用户消息、历史、agentCode、workflowCode、工具授权、知识库范围等。 |
| `WorkflowExecutionResult` | 工作流执行结果。 |
| `WorkflowStreamEvent` | 工作流流式事件。 |

**保留建议**

保留。它替代了旧 `core/types.ts` 里的 workflow 类型。

---

### 6.2 `src/ai-engine/workflow/workflow-runtime.service.ts`

**定位**

工作流运行入口。

**方法**

| 方法 | 作用 |
| --- | --- |
| `execute(workflowCode, input)` | 加载启用工作流图，调用 `WorkflowExecutorService.execute`。 |
| `stream(workflowCode, input)` | 加载启用工作流图，调用 `WorkflowExecutorService.streamExecute`。 |
| `loadEnabledGraph(workflowCode)` | 查询启用 workflow、节点、边，组装成 `WorkflowGraph`；不存在或禁用时报错。 |

**保留建议**

保留。Agent workflow 分支依赖它。

---

### 6.3 `src/ai-engine/workflow/workflow-executor.service.ts`

**定位**

工作流核心执行器。

**方法**

| 方法 | 作用 |
| --- | --- |
| `execute(graph, input)` | 非流式执行完整工作流，创建运行记录，逐节点执行，完成后写 `AiWorkflowRun`。 |
| `streamExecute(graph, input)` | 流式执行工作流，yield workflow_start、node_start、content、node_end、sources、workflow_done 等事件。 |
| `executeNodes(graph, input, values, runId)` | 非流式内部节点循环，沿边执行直到 output。 |
| `runNode(node, values, input)` | 执行单个节点。按 node.type 分支处理 start/prompt/knowledge/llm/tool/condition/output。 |
| `streamLlmNode(node, values, input)` | 流式执行 LLM 节点；知识场景会先缓存模型输出，校验后一次性输出最终答案。 |
| `buildLlmMessages(config, values, input)` | 构建 LLM messages；有知识来源时拼知识 system prompt。 |
| `hasKnowledgeSources(values)` | 判断当前工作流上下文是否已有知识检索结果。 |
| `buildStandaloneKnowledgeQuestion(message, history)` | 用最近用户消息补全追问，用于知识检索和 LLM 上下文。 |
| `buildKnowledgeSystemPrompt(systemPrompt, facts)` | 构建知识问答 system prompt。 |
| `buildKnowledgeEvidence(facts)` | 把知识事实整理为事实依据文本。 |
| `buildKnowledgeFacts(sources)` | 从知识检索结果提取事实。 |
| `compactKnowledgeContent(content)` | 清洗 chunk 文本。 |
| `splitKnowledgeFactTexts(content)` | 切分事实文本。 |
| `ensureKnowledgeAnswer(answer, facts, question?)` | 校验 LLM 输出，不可信则返回事实兜底。 |
| `ensureSingleStreamingLlmNode(graph)` | 当前流式版本限制只允许一个 LLM 节点。 |
| `pickNextNodeKey(node, graph, values)` | 根据边和 condition 选择下一个节点。 |
| `matchCondition(condition, values)` | 判断 condition 节点或边条件是否命中。 |
| `ensureToolAllowed(toolCode, allowedToolCodes)` | 校验工具是否在 Agent 授权列表中。 |
| `buildToolParams(toolCode, params, input)` | 构造工具参数，比如给 `get_user_menu_permissions` 自动补 userId。 |
| `readValue(values, field)` | 从 values 中按点路径读取变量。 |

**保留建议**

保留。但它是当前 AI 模块最大文件之一，后续可按节点类型拆分执行策略。

---

### 6.4 `src/ai-engine/workflow/workflow-validator.service.ts`

**定位**

工作流图校验器。

**方法**

| 方法 | 作用 |
| --- | --- |
| `validateGraph(graph)` | 校验节点 key 唯一、必须有且仅有一个 start、必须有 output、边两端节点存在、图无环。 |
| `validateNode(node)` | 按节点类型校验必填配置，如 promptId、queryField、toolCode、outputField 等。 |
| `ensureAcyclic(nodes, edges)` | DFS 检测环，避免工作流运行死循环。 |

**保留建议**

保留。它是工作流配置保存/测试运行前的重要防线。

---

### 6.5 `src/ai-engine/workflow/workflow-run-logger.service.ts`

**定位**

工作流运行日志服务。

**方法**

| 方法 | 作用 |
| --- | --- |
| `startRun(params)` | 创建 `AiWorkflowRun`，记录输入、agentCode、workflowCode、conversationId。 |
| `logStep(params)` | 写入 `AiWorkflowRunStep`，记录单个节点成功/失败、输入输出或错误。 |
| `finishRun(runId, output)` | 标记 workflow run 成功并保存最终输出。 |
| `failRun(runId, errorMessage)` | 标记 workflow run 失败并保存错误信息。 |

**保留建议**

保留。它和 `AiAgentExecutionLog` 不重复：前者是工作流 step 级，后者是 Agent 请求级摘要。

---

## 7. `src/modules/ai-platform` 文件说明

### 7.1 `src/modules/ai-platform/ai-platform.module.ts`

**定位**

AI 配置后台模块。

**主要内容**

| 内容 | 说明 |
| --- | --- |
| controllers | 注册 Prompt、SensitiveWord、Agent、Tool、Workflow、SkillPackage、WorkflowRun 的 controller。 |
| providers | 注册对应 service。 |
| exports | 导出配置服务，供其他模块需要时复用。 |

**保留建议**

保留。若后续删除 `skill-package` 或旧模块，需要从这里同步移除。

---

### 7.2 Prompt 配置

#### `src/modules/ai-platform/prompt/prompt.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询提示词分页列表。 |
| `detail(query)` | 查询提示词详情。 |
| `create(dto)` | 新增提示词。 |
| `update(dto)` | 修改提示词。 |
| `updateStatus(dto)` | 启用/停用提示词。 |
| `delete(dto)` | 删除提示词，删除前检查 Agent 引用。 |

#### `src/modules/ai-platform/prompt/prompt.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 根据 code/name/scene/status 分页查询 `AiPrompt`。 |
| `detail(id)` | 读取单个提示词，不存在时报错。 |
| `create(dto)` | 校验 code 唯一，创建提示词。 |
| `update(dto)` | 更新提示词，必要时同步启用 Agent 的 `promptSnapshot`。 |
| `updateStatus(dto)` | 修改提示词启用状态。 |
| `delete(id)` | 删除提示词；如果被 Agent 引用则拒绝。 |
| `syncAgentPromptSnapshots(promptId, content)` | 更新所有开启 promptSyncEnabled 的 Agent 快照。 |
| `ensurePrompt(id)` | 内部方法，确认提示词存在。 |
| `ensureUniqueCode(code, excludeId?)` | 内部方法，确认 code 不重复。 |

#### `src/modules/ai-platform/prompt/dto/prompt.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `CreatePromptDto` | 新增提示词字段：code/name/scene/content/status/remark。 |
| `UpdatePromptDto` | 修改提示词，继承新增 DTO 并要求 id。 |
| `PromptListDto` | 列表查询条件。 |
| `PromptDetailDto` | 详情查询 id。 |
| `PromptStatusDto` | 状态修改 id/status。 |
| `DeletePromptDto` | 删除 id。 |

---

### 7.3 Sensitive Word 配置

#### `src/modules/ai-platform/sensitive-word/sensitive-word.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询敏感词分页列表。 |
| `detail(query)` | 查询敏感词详情。 |
| `create(dto)` | 新增敏感词。 |
| `update(dto)` | 修改敏感词。 |
| `updateStatus(dto)` | 启用/停用敏感词。 |

#### `src/modules/ai-platform/sensitive-word/sensitive-word.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 按 word/category/scope/action/status 分页查询。 |
| `detail(id)` | 查询详情。 |
| `create(dto)` | 校验 word+scope 唯一后创建。 |
| `update(dto)` | 修改敏感词；如果 word/scope 变化，重新做唯一性校验。 |
| `updateStatus(dto)` | 修改启用状态。 |
| `ensureWord(id)` | 内部方法，确认敏感词存在。 |
| `ensureUniqueWord(word, scope, excludeId?)` | 内部方法，确认同 scope 下 word 不重复。 |

#### `src/modules/ai-platform/sensitive-word/dto/sensitive-word.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `CreateSensitiveWordDto` | 新增敏感词字段：word/category/action/scope/replaceWith/status/remark。 |
| `UpdateSensitiveWordDto` | 修改敏感词。 |
| `SensitiveWordListDto` | 列表查询条件。 |
| `SensitiveWordDetailDto` | 详情 id。 |
| `SensitiveWordStatusDto` | 状态修改。 |

---

### 7.4 Agent 配置

#### `src/modules/ai-platform/agent/agent.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询 Agent 分页列表。 |
| `detail(query)` | 查询 Agent 详情。 |
| `enabledOptions()` | 查询启用 Agent，用于聊天端选择。 |
| `configOptions()` | 查询 Agent 表单所需选项：prompt、workflow、tool、model。 |
| `create(dto)` | 新增 Agent。 |
| `update(dto)` | 修改 Agent。 |
| `updateStatus(dto)` | 启用/停用 Agent。 |

#### `src/modules/ai-platform/agent/agent.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 按 code/name/mode/status 查询 Agent，并附带知识库绑定。 |
| `detail(id)` | 查询单个 Agent 详情。 |
| `enabledOptions()` | 返回启用 Agent 的完整运行配置，供聊天页选择。 |
| `configOptions()` | 返回 Agent 配置表单选项：启用 prompt、启用 workflow、注册工具、模型选项。 |
| `create(dto)` | 创建 Agent；校验 prompt、workflow、knowledgeBase、tool、workflow 必需工具，然后生成服务端 code。 |
| `update(dto)` | 修改 Agent；支持同步知识库绑定和 promptSnapshot。 |
| `updateStatus(dto)` | 修改 Agent 状态。 |
| `toAgentData(dto, fallbackPromptId?)` | 内部方法，把 DTO 转成 Prisma 可写数据，并处理 promptSnapshot、knowledgeEnabled。 |
| `resolvePromptSnapshot(promptId?, snapshot?)` | 内部方法，优先使用手工快照，否则读取 prompt content。 |
| `nextAgentCode()` | 内部方法，生成 `ZNT` + 16 位数字的 Agent code。 |
| `ensureAgent(id)` | 内部方法，确认 Agent 存在并加载知识库绑定。 |
| `ensureEnabledKnowledgeBases(ids)` | 内部方法，确认绑定知识库都启用。 |
| `ensureEnabledPrompt(promptId)` | 内部方法，确认 prompt 存在且启用。 |
| `ensureEnabledWorkflow(workflowCode)` | 内部方法，确认 workflow 存在且启用。 |
| `ensureKnownTools(toolCodes?)` | 内部方法，确认工具都已注册到 `AIRegistry`。 |
| `ensureWorkflowRequiredTools(workflowCode, toolCodes?)` | 内部方法，确认 Agent 授权了 workflow 中 knowledge/tool 节点需要的工具。 |
| `collectWorkflowRequiredToolCodes(nodes)` | 内部方法，从 workflow 节点提取必需工具，knowledge 节点需要 `search_knowledge`。 |
| `collectWorkflowPromptIds(nodes)` | 内部方法，从 prompt 节点提取 promptId。 |
| `normalizeNodeConfig(config)` | 内部方法，安全解析节点 JSON 配置。 |
| `normalizeKnowledgeBaseIds(ids?)` | 内部方法，去空、去重知识库 ID。 |
| `extractKnowledgeBaseIds(agent)` | 内部方法，从 Agent include 结果中提取知识库 ID。 |
| `toAgentResponse(agent)` | 内部方法，把 Prisma include 结构转成前端需要的结构。 |
| `syncKnowledgeBaseBindings(agentId, ids)` | 内部方法，重建 Agent 和知识库关联。 |

#### `src/modules/ai-platform/agent/dto/agent.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `CreateAgentDto` | 新增 Agent 配置：名称、描述、头像、欢迎语、推荐问题、tags、promptId、prompt 策略、模型参数、知识库、工具、workflow、状态等。 |
| `UpdateAgentDto` | 修改 Agent。 |
| `AgentListDto` | 列表查询条件。 |
| `AgentDetailDto` | 详情 id。 |
| `AgentStatusDto` | 状态修改 id/status。 |

---

### 7.5 Tool 配置

#### `src/modules/ai-platform/tool/tool.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list()` | 返回当前注册工具列表。 |

#### `src/modules/ai-platform/tool/tool.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list()` | 从 `AIRegistry` 读取工具元数据，不返回 handler。 |

**保留建议**

保留。它是后台工具选项来源。

---

### 7.6 Workflow 配置

#### `src/modules/ai-platform/workflow/workflow.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询 workflow 分页列表。 |
| `detail(query)` | 查询 workflow 详情。 |
| `create(dto)` | 新增 workflow。 |
| `update(dto)` | 修改 workflow 基本信息。 |
| `updateStatus(dto)` | 启用/停用 workflow。 |
| `saveGraph(dto)` | 保存 workflow 节点和边。 |
| `validate(dto)` | 校验 workflow 图。 |
| `testRun(dto, req)` | 以当前用户执行测试运行。 |

#### `src/modules/ai-platform/workflow/workflow.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 按 code/name/status 分页查询 workflow，并统计节点数、边数。 |
| `detail(id)` | 查询 workflow 详情，包含节点和边。 |
| `create(dto)` | 校验 code 唯一后创建 workflow。 |
| `update(dto)` | 修改 workflow 基本信息。 |
| `updateStatus(dto)` | 修改状态；停用时检查是否有启用 Agent 正在绑定。 |
| `saveGraph(dto)` | 校验图后，用事务删除旧节点/边并创建新节点/边。 |
| `validate(dto)` | 调用 `WorkflowValidatorService.validateGraph` 校验图。 |
| `testRun(dto, userId)` | 调用 `WorkflowRuntimeService.execute` 进行测试运行。 |
| `ensureWorkflow(id)` | 内部方法，确认 workflow 存在。 |
| `ensureUniqueCode(code, excludeId?)` | 内部方法，确认 code 不重复。 |

#### `src/modules/ai-platform/workflow/dto/workflow.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `CreateWorkflowDto` | 新增 workflow 基本信息。 |
| `UpdateWorkflowDto` | 修改 workflow。 |
| `WorkflowListDto` | 列表查询。 |
| `WorkflowDetailDto` | 详情 id。 |
| `WorkflowStatusDto` | 状态修改。 |
| `WorkflowNodeDto` | 节点 DTO，包含 nodeKey/type/name/config/sortNo。 |
| `WorkflowEdgeDto` | 边 DTO，包含 fromNodeKey/toNodeKey/condition/sortNo。 |
| `SaveWorkflowGraphDto` | 保存图结构。 |
| `ValidateWorkflowGraphDto` | 校验图结构。 |
| `TestRunWorkflowDto` | 工作流测试运行入参。 |

---

### 7.7 Workflow Run 查询

#### `src/modules/ai-platform/workflow-run/workflow-run.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询工作流运行记录。 |
| `detail(query)` | 查询运行详情和 step 明细。 |

#### `src/modules/ai-platform/workflow-run/workflow-run.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 按 agentCode/workflowCode/status 分页查询 `AiWorkflowRun`。 |
| `detail(id)` | 查询单次运行详情，包含 steps。 |

#### `src/modules/ai-platform/workflow-run/dto/workflow-run.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `WorkflowRunListDto` | 运行记录列表查询条件。 |
| `WorkflowRunDetailDto` | 运行详情 id。 |

**保留建议**

保留。它是 workflow 自己的运行排查入口，不等于旧 Agent trace。

---

### 7.8 Skill Package

#### `src/modules/ai-platform/skill-package/skill-package.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询技能包分页列表。 |
| `detail(query)` | 查询技能包详情。 |
| `create(dto)` | 新增技能包。 |
| `update(dto)` | 修改技能包。 |
| `updateStatus(dto)` | 启用/停用技能包。 |
| `installToAgent(dto)` | 把技能包配置安装到已有 Agent。 |

#### `src/modules/ai-platform/skill-package/skill-package.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 按 code/name/status 查询 `AiSkillPackage`。 |
| `detail(id)` | 查询技能包详情。 |
| `create(dto)` | 校验 code 和引用后创建技能包。 |
| `update(dto)` | 修改技能包，支持 code 唯一性和引用校验。 |
| `updateStatus(dto)` | 修改技能包启用状态。 |
| `installToAgent(dto)` | 读取技能包 promptIds/toolCodes/workflowCode/agentDefaults，并写入指定 Agent。 |
| `toPackageData(dto)` | 内部方法，把 DTO 转成 Prisma 可写数据。 |
| `validateReferences(dto)` | 内部方法，校验 prompt、workflow、tool 是否存在且可用。 |
| `ensurePackage(id)` | 内部方法，确认技能包存在。 |
| `ensureUniqueCode(code, excludeId?)` | 内部方法，确认 code 不重复。 |
| `normalizeStringArray(value)` | 内部方法，Json 转字符串数组。 |
| `isRecord(value)` | 内部方法，判断 Json 是否普通对象。 |

#### `src/modules/ai-platform/skill-package/dto/skill-package.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `CreateSkillPackageDto` | 新增技能包：code/name/description/promptIds/toolCodes/workflowCode/agentDefaults/status/remark。 |
| `UpdateSkillPackageDto` | 修改技能包。 |
| `SkillPackageListDto` | 列表查询。 |
| `SkillPackageDetailDto` | 详情 id。 |
| `SkillPackageStatusDto` | 状态修改。 |
| `InstallSkillPackageDto` | 安装到 Agent 的 packageId/agentId。 |

**保留建议**

暂时保留。它当前是“Agent 配置模板/安装包”，不是旧 capability。若未来不做模板市场或技能包安装，可再删。

---

## 8. `src/modules/knowledge-bot` 文件说明

### 8.1 `src/modules/knowledge-bot/knowledge-bot.module.ts`

**定位**

聊天、会话、知识库和知识工具模块。

**方法**

| 方法 | 作用 |
| --- | --- |
| `onModuleInit()` | 模块启动时调用 `registerKnowledgeBotAI` 注册知识库工具和用户菜单权限工具。 |

**主要内容**

| 内容 | 说明 |
| --- | --- |
| controllers | 注册 Chat、旧 Knowledge、KnowledgeBase、Conversation controller。 |
| providers | 注册 Chat、旧 Knowledge、KnowledgeBase、Storage、Conversation、工具服务。 |

**清理建议**

如果删除 legacy `knowledge/**`，需要同步从这里移除 `KnowledgeController` 和 `KnowledgeService`。

---

### 8.2 Chat

#### `src/modules/knowledge-bot/chat/chat.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `chat(body, req)` | 普通聊天接口，调用 `ChatService.chat`。 |
| `stream(body, req, res)` | SSE 流式聊天接口，调用 `ChatService.stream` 并把事件写成 SSE。 |
| `writeSse(res, event)` | 内部方法，把事件序列化为 `data: xxx\n\n`。 |
| `toPublicStreamError(error)` | 内部方法，把异常映射成前端可显示的安全错误码和文案。 |

#### `src/modules/knowledge-bot/chat/chat.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `chat(body, userId)` | 非流式聊天。先做输入敏感词检查，解析 Agent，创建/读取会话，保存用户消息，调用 AgentRuntime，做输出敏感词检查，保存 assistant 消息并返回结果。 |
| `stream(body, userId)` | 流式聊天。流程与非流式一致，但从 AgentRuntime 逐个 yield event，结束后再保存完整 assistant 消息。 |
| `normalizeMode(mode)` | 内部方法，把未知 mode 兜底成 `chat`，只允许 `knowledge` 透传。 |

**关键边界**

- ChatService 不再直接依赖 `AiOrchestratorService` 或 `WorkflowRuntimeService`。
- ChatService 负责会话、敏感词和落库，AI 执行委托给 AgentRuntime。

#### `src/modules/knowledge-bot/chat/dto/chat.dto.ts`

**DTO**

| DTO/类型 | 作用 |
| --- | --- |
| `ChatMode` | `chat` 或 `knowledge`。 |
| `ChatRequestDto` | 聊天请求：message、mode、conversationId、agentCode。 |
| `ChatStreamRequestDto` | 流式聊天请求，继承 ChatRequestDto。 |

---

### 8.3 Conversation

#### `src/modules/knowledge-bot/conversation/conversation.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query, req)` | 查询当前用户会话列表。 |
| `create(body, req)` | 创建会话。 |
| `detail(query, req)` | 查询会话详情和消息。 |
| `rename(body, req)` | 重命名会话。 |
| `delete(body, req)` | 软删除会话。 |

#### `src/modules/knowledge-bot/conversation/conversation.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(userId, query)` | 按用户、agentCode、删除状态分页查询会话。 |
| `create(userId, mode, title, agentCode?)` | 创建新会话。 |
| `detail(userId, id)` | 查询当前用户的会话详情和消息。 |
| `rename(userId, id, title)` | 修改会话标题。 |
| `delete(userId, id)` | 软删除会话。 |
| `getOrCreateForMessage(userId, params)` | 聊天时获取已有会话或自动创建新会话。 |
| `getHistoryMessages(conversationId, limit?)` | 查询最近历史消息，并过滤不适合进入 prompt 的内容。 |
| `addMessage(conversationId, role, content, sources?, meta?)` | 保存 user/assistant 消息，并写入 agentCode、promptId、workflowCode 等审计字段。 |
| `touchConversation(id)` | 更新会话 updatedAt。 |
| `ensureConversation(userId, id)` | 内部方法，确认会话属于当前用户且未删除。 |
| `buildTitle(message)` | 内部方法，根据首条消息生成标题。 |
| `normalizeTitle(title)` | 内部方法，清洗标题长度和空值。 |
| `isCleanAssistantHistoryContent(content)` | 内部方法，过滤不应进入历史上下文的 assistant 内容。 |

#### `src/modules/knowledge-bot/conversation/dto/conversation.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `ConversationListDto` | 会话列表查询。 |
| `CreateConversationDto` | 创建会话。 |
| `ConversationDetailDto` | 会话详情 id。 |
| `RenameConversationDto` | 重命名。 |
| `DeleteConversationDto` | 删除。 |

---

### 8.4 Legacy Knowledge

#### `src/modules/knowledge-bot/knowledge/knowledge.controller.ts`

**定位**

旧 chunk 级知识 API，路径为 `/knowledge-bot/knowledge`。

**方法**

| 方法 | 作用 |
| --- | --- |
| `createKnowledge(body)` | 新增一段纯文本知识。 |
| `upload(file, metadata?)` | 上传文件并写入向量库。 |
| `list(query)` | 查询旧知识 chunk 列表。 |
| `delete(body)` | 删除指定 chunk。 |
| `revector(body)` | 对指定 chunk 重新向量化。 |
| `searchSimilar(query)` | 相似度检索。 |

#### `src/modules/knowledge-bot/knowledge/knowledge.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `createKnowledge(content, metadata?)` | 调用 `VectorStoreService.addDocuments` 写入文本。 |
| `upload(file, metadata?)` | 读取上传文件 buffer，解析 metadata 后写入向量库。 |
| `searchSimilar(query, limit?)` | 调用向量检索。 |
| `list(query)` | 调用 vector list 分页查询。 |
| `delete(id)` | 删除指定 document。 |
| `revector(id)` | 重新生成指定 document 的 embedding。 |

#### `src/modules/knowledge-bot/knowledge/dto/create-knowledge.dto.ts`

**DTO**

| DTO | 字段职责 |
| --- | --- |
| `CreateKnowledgeDto` | 旧文本知识新增入参，承载纯文本 `content` 和可选 `metadata`。实际写入逻辑在 `KnowledgeService.createKnowledge`，DTO 只负责接口参数结构。 |

#### `src/modules/knowledge-bot/knowledge/dto/knowledge-list.dto.ts`

**DTO**

| DTO | 字段职责 |
| --- | --- |
| `KnowledgeListDto` | 旧知识 chunk 列表查询入参，承载分页和关键字查询条件。实际分页查询由 `KnowledgeService.list` 委托给 `VectorStoreService.list`。 |

#### `src/modules/knowledge-bot/knowledge/dto/search-knowledge.dto.ts`

**DTO**

| DTO | 字段职责 |
| --- | --- |
| `SearchKnowledgeDto` | 旧知识相似度检索入参，承载查询文本和可选 limit。实际向量检索由 `KnowledgeService.searchSimilar` 委托给 `VectorStoreService.similaritySearch`。 |

#### `src/modules/knowledge-bot/knowledge/dto/delete-knowledge.dto.ts`

**DTO**

| DTO | 字段职责 |
| --- | --- |
| `DeleteKnowledgeDto` | 旧知识 chunk 删除入参，承载 document/chunk id。实际删除由 `KnowledgeService.delete` 调用向量存储删除。 |

#### `src/modules/knowledge-bot/knowledge/dto/revector-knowledge.dto.ts`

**DTO**

| DTO | 字段职责 |
| --- | --- |
| `RevectorKnowledgeDto` | 旧知识 chunk 重向量化入参，承载 document/chunk id。实际重算 embedding 由 `KnowledgeService.revector` 委托给 `VectorStoreService.revectorById`。 |

**清理建议**

建议标记 legacy 并迁移删除。当前新知识库模型已经由 `knowledge-base/**` 承担，Agent Runtime 不应直接依赖旧 `knowledge/**`。

---

### 8.5 Knowledge Base

#### `src/modules/knowledge-bot/knowledge-base/knowledge-base.controller.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询知识库分页列表。 |
| `options()` | 返回启用知识库选项，供 Agent 配置绑定。 |
| `embeddingProfiles()` | 返回可选 embedding profile。 |
| `detail(query)` | 查询知识库详情。 |
| `create(body)` | 新增知识库。 |
| `update(body)` | 修改知识库。 |
| `status(body)` | 启用/停用知识库。 |
| `delete(body)` | 删除知识库及其文件/chunk/Agent 绑定。 |
| `fileList(query)` | 查询知识库文件列表。 |
| `uploadFile(knowledgeBaseId, file)` | 上传文件到知识库。 |
| `downloadFile(query, response)` | 下载原始文件。 |
| `replaceFile(knowledgeBaseId, fileId, file)` | 替换文件并重建 chunk。 |
| `rechunkFile(body)` | 对单个文件重新切片和向量化。 |
| `rechunkAll(body)` | 对知识库所有文件重新切片和向量化。 |
| `deleteFile(body)` | 删除文件及其 chunk。 |
| `chunkList(query)` | 查询 chunk 列表。 |
| `chunkDetail(query)` | 查询 chunk 详情。 |
| `updateChunk(body)` | 修改 chunk 内容并重新向量化。 |
| `deleteChunk(body)` | 删除 chunk。 |
| `searchTest(query)` | 在指定知识库内做检索测试。 |

#### `src/modules/knowledge-bot/knowledge-base/knowledge-base.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `list(query)` | 查询知识库列表，并统计文件数和 chunk 数。 |
| `detail(id)` | 查询知识库详情，隐藏 API Key 明文，只返回是否已配置。 |
| `embeddingProfiles()` | 返回 embedding profiles。 |
| `enabledOptions()` | 返回启用知识库选项。 |
| `create(dto)` | 创建知识库，服务端生成 `ZSK` code。 |
| `update(dto)` | 修改知识库；如果已有 chunk，不允许修改向量维度。 |
| `updateStatus(id, status)` | 修改知识库状态。 |
| `delete(id)` | 删除知识库、文件、chunk、Agent 绑定，并删除本地文件目录。 |
| `fileList(query)` | 查询知识库文件。 |
| `uploadFile(knowledgeBaseId, file)` | 保存文件、切片、向量化、更新文件状态。失败时记录 errorMessage。 |
| `downloadFile(fileId)` | 返回文件下载路径和原始文件名。 |
| `replaceFile(knowledgeBaseId, fileId, file)` | 替换原文件目录，重建 chunk，并更新文件元信息。 |
| `rechunkFile(knowledgeBaseId, fileId)` | 读取已存储文件，重新切片和向量化。 |
| `rechunkAll(knowledgeBaseId)` | 遍历知识库全部文件执行 rechunk。 |
| `deleteFile(knowledgeBaseId, fileId)` | 删除文件记录、对应 chunks 和本地文件目录。 |
| `chunkList(query)` | 查询 chunks。 |
| `chunkDetail(id)` | 查询单个 chunk。 |
| `updateChunk(id, content)` | 修改 chunk 并重新生成 embedding。 |
| `deleteChunk(id)` | 删除 chunk，并同步文件 chunkCount。 |
| `searchTest(query)` | 对指定知识库做相似度检索，并按知识库阈值过滤。 |
| `rebuildFileChunks(knowledgeBaseId, fileId, content, metadata)` | 内部方法，删除旧 chunk，按知识库配置重新切片和向量化。 |
| `syncFileChunkCount(fileId)` | 内部方法，同步文件 chunk 数。 |
| `ensureKnowledgeBase(id)` | 内部方法，确认知识库存在。 |
| `ensureEnabledKnowledgeBase(id)` | 内部方法，确认知识库存在且启用。 |
| `ensureFile(fileId, knowledgeBaseId?)` | 内部方法，确认文件存在，可限定知识库。 |
| `toKnowledgeBaseData(dto, currentProfileCode?)` | 内部方法，把 DTO 和 embedding profile 转成 Prisma 写入数据。 |
| `toListItem(item)` | 内部方法，补充 fileCount/chunkCount 并隐藏 API Key。 |
| `toEmbeddingConfig(knowledgeBase)` | 内部方法，生成向量化配置。 |
| `nextKnowledgeBaseCode()` | 内部方法，生成 `ZSK` + 16 位数字 code。 |
| `normalizeOriginalName(originalName)` | 内部方法，处理中文文件名编码问题。 |
| `hideApiKey(item)` | 内部方法，移除 apiKeyEncrypted，返回 apiKeyConfigured。 |
| `errorMessage(error)` | 内部方法，统一提取错误文案。 |

#### `src/modules/knowledge-bot/knowledge-base/knowledge-storage.service.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `checksum(buffer)` | 计算文件 checksum。 |
| `saveFile(knowledgeBaseCode, fileId, originalName, buffer)` | 按知识库 code 和 fileId 保存原始文件。 |
| `readStoragePath(storagePath)` | 读取已保存文件。 |
| `resolveDownloadPath(storagePath)` | 返回下载用绝对路径。 |
| `removeFileDirectory(knowledgeBaseCode, fileId)` | 删除指定文件目录。 |
| `removeKnowledgeBaseDirectory(knowledgeBaseCode)` | 删除整个知识库目录。 |
| `safeJoin(...segments)` | 内部方法，拼接路径并限制在 uploads/knowledge 根目录下。 |

#### `src/modules/knowledge-bot/knowledge-base/embedding-profiles.ts`

**内容**

| 内容 | 作用 |
| --- | --- |
| `EmbeddingProfile` | embedding profile 类型。 |
| `EMBEDDING_PROFILES` | 可选 embedding 配置列表。 |
| `getEmbeddingProfile(code?)` | 根据 code 返回 profile；没有 code 时返回默认 profile。 |

#### `src/modules/knowledge-bot/knowledge-base/dto/knowledge-base.dto.ts`

**DTO**

| DTO | 作用 |
| --- | --- |
| `KnowledgeBaseListDto` | 知识库列表查询。 |
| `CreateKnowledgeBaseDto` | 创建知识库，包含名称、描述、embedding、切片、检索阈值等配置。 |
| `UpdateKnowledgeBaseDto` | 修改知识库。 |
| `KnowledgeBaseIdDto` | 知识库 id。 |
| `KnowledgeBaseStatusDto` | 知识库状态修改。 |
| `KnowledgeFileListDto` | 文件列表查询。 |
| `KnowledgeFileIdDto` | 文件 id。 |
| `KnowledgeBaseFileActionDto` | 文件操作，包含 knowledgeBaseId 和 fileId。 |
| `KnowledgeChunkListDto` | chunk 列表查询。 |
| `KnowledgeChunkIdDto` | chunk id。 |
| `UpdateKnowledgeChunkDto` | 修改 chunk 内容。 |
| `KnowledgeSearchTestDto` | 知识库检索测试。 |

**保留建议**

保留。这是当前推荐知识库体系。

---

### 8.6 AI 工具注册

#### `src/modules/knowledge-bot/ai/register.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `registerKnowledgeBotAI(registry, searchKnowledgeTool, getUserMenuPermissionsTool?)` | 注册 `search_knowledge` 和可选 `get_user_menu_permissions` 到 `AIRegistry`。 |

#### `src/modules/knowledge-bot/ai/tools/search-knowledge.tool.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `definition()` | 返回工具定义：name、description、params、handler。 |
| `execute(params)` | 调用 `VectorStoreService.similaritySearch` 检索知识。 |

#### `src/modules/knowledge-bot/ai/tools/get-user-menu-permissions.tool.ts`

**方法**

| 方法 | 作用 |
| --- | --- |
| `definition()` | 返回工具定义。 |
| `execute(params)` | 根据 userId 查询用户菜单/权限信息，供工作流工具节点使用。 |

**保留建议**

保留。`search_knowledge` 是 RAG 和 workflow knowledge 的关键工具授权 code。

## 9. 后续清理建议

### 9.1 第一优先级：删除 memory

建议删除：

```text
src/ai-engine/memory/memory.service.ts
```

同步修改：

```text
src/ai-engine/ai-engine.module.ts
src/ai-engine/core/interfaces.ts
```

原因：

- 没有业务链路调用。
- 当前 conversation/history 已承担上下文。
- `memory` 命名会误导为已支持长期记忆。

### 9.2 第二优先级：收窄 core

建议删除或迁移：

```text
src/ai-engine/core/types.ts
src/ai-engine/core/interfaces.ts 中的 MemoryService / ExtendedRouteResult / AgentState
```

保留：

```text
ToolExecutor
ToolDefinition
AIRegistry
```

原因：

- 当前正式 Agent 类型在 `agent-runtime.types.ts`。
- 当前正式 Workflow 类型在 `workflow.types.ts`。
- 旧 route/result/state 名称容易把人带回旧 Agent Router 思路。

### 9.3 第三优先级：迁移并删除 legacy knowledge

建议后续删除：

```text
src/modules/knowledge-bot/knowledge/**
```

同步检查：

```text
src/modules/knowledge-bot/knowledge-bot.module.ts
fullstack-admin-serve/vue-element-admin-dev/src/api/ai.js
权限 seed 中的 ai:knowledge:* 权限
Swagger 文档
```

原因：

- 当前标准知识库模型已经是 `knowledge-base -> file -> chunk -> vector`。
- 旧 `knowledge` 是 chunk 级 API，会造成双入口维护成本。
- Agent Runtime 不应该依赖旧入口。

### 9.4 暂不建议动

| 文件/模块 | 原因 |
| --- | --- |
| `agent/**` | 当前最小 Agent Runtime 主链。 |
| `workflow/**` | 工作流运行和日志仍有价值。 |
| `orchestrator/**` | 仍承担 LLM/RAG completion builder。 |
| `knowledge-answer.util.ts` | ToB 知识答案事实校验关键能力。 |
| `skill-package/**` | 当前是配置模板；是否删除需要业务决策。 |
