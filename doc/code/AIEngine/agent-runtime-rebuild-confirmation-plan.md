# AI 对话开发 V2 五目录收敛计划

## 文档目的

本文是 AI 对话开发 V2 的当前权威计划，用于统一目录边界、迁移顺序、禁止事项和验收口径。

本文只授权计划确认，不授权源码迁移、Prisma 修改、数据库写入、旧代码删除或前端切换。真正执行前，必须按本文阶段逐步确认。

## 当前结论

这次已经撤回的改动暴露出一个方向问题：不能为了让 V2 不引用旧目录，就把旧的模型、RAG、工具、工作流、安全检查整套搬到 `src/ai-runtime`。

V2 的目标是建立一套干净的运行链路，而不是复制一份旧 AI 平台。

后续只围绕以下 5 个 AI V2 目录收敛：

```text
src/modules/chat/          普通对话入口
src/modules/agent-chat/    Agent 对话和会话入口
src/modules/ai-config/     AI 基础配置中心
src/modules/knowledge/     知识资产管理
src/ai-runtime/            AI 内部运行时能力层
```

入口决定对话模式：

```text
/chat        表示普通聊天入口
/agent/chat  表示 Agent 聊天入口
```

普通聊天不再靠 `mode`、`knowledgeEnabled` 或 `agentCode` 判断是否进入 Agent。Agent 聊天也不再承担普通对话兜底。

旧目录后续只作为迁移来源，不能继续扩展为 V2 能力入口：

```text
src/ai-engine
src/modules/knowledge-bot
src/modules/ai-platform
```

## 核心原则

### 简洁原则

V2 不追求一次性拥有完整 AI 平台能力，只迁移当前对话闭环真实需要的能力。

禁止因为旧目录后续要删除，就提前把所有旧文件搬到新目录。

### 真实链路原则

每一处新增目录、Provider、Handler、分支和默认值，都必须对应当前真实调用链。

如果某个能力当前没有 V2 入口调用，先不迁移，只在计划中标记为后续阶段。

### 单一入口原则

运行时配置、模型选择、RAG 检索、工具执行、工作流执行、安全检查都必须有明确入口。

禁止在 Controller、Service、Handler 多处补默认值、补环境变量、补兼容分支。

### 分阶段删除原则

旧代码只能在新入口已接管、测试通过、引用清零后删除。

不得先删除旧链路再补新链路。

## 五个目录职责

### `src/modules/chat`

普通对话入口。

职责：

```text
普通聊天 HTTP 入口
普通会话创建、读取、消息保存
普通模型对话请求适配
输入和输出安全检查闭环
调用已确认的统一模型入口
```

禁止：

```text
不处理 Agent 配置
不读取 Agent toolCodes / workflowCode
不自动 RAG
不执行工具
不执行工作流
```

当前状态：

```text
第一版已建立 `POST /chat`。
当前只做非流式普通聊天，不做 `/chat/stream`。
当前使用既有 `ModelResolverService`、`LlmService`、`SensitiveWordCheckerService` 作为已确认底层入口。
未迁移模型底层实现到 `ai-runtime`，也未新增通用中转层。
```

### `src/modules/agent-chat`

Agent 对话和会话入口。

职责：

```text
Agent 聊天 HTTP/SSE 入口
Agent 会话创建、读取、消息保存
agentCode 校验和请求适配
输入和输出安全检查闭环
调用 ai-runtime 的 Agent 运行链路
```

禁止：

```text
不在 Controller 中判断意图
不在 Controller 中做 RAG 检索
不在 Controller 中执行工具
不在 Controller 中执行工作流
不直接拼接模型 prompt
```

### `src/modules/ai-config`

AI 基础配置中心。

职责：

```text
模型供应商配置
模型配置
Prompt 配置
敏感词配置
Agent 配置
工具、工作流、技能包是否并入本目录，需要后续单独确认
```

当前取舍：

```text
当前已有 prompt 和 sensitive-word。
model-provider、model-config、agent 仍在 ai-platform。
后续若迁移 ai-platform，优先迁入 ai-config，而不是新建 ai-admin。
```

### `src/modules/knowledge`

知识资产管理。

职责：

```text
知识库管理
文件上传、替换、下载
Chunk 管理
向量入库和重建
检索测试
```

禁止：

```text
不负责 Agent 最终回答
不负责对话意图判断
不负责工具和工作流编排
```

### `src/ai-runtime`

AI 内部运行时能力层。

职责：

```text
运行时请求类型
Context 构建
Capability 解析
Router / Planner
Validator
Executor
Composer
Trace
运行时端口和统一 Provider
```

允许：

```text
保留运行时主链和薄端口
保留 Chat / RAG / Tool / Workflow Handler
保留协议无关 AgentEvent
保留 SSE Adapter
```

禁止：

```text
不复制一整套 ai-engine
不复制完整模型管理
不复制完整向量库管理
不复制完整知识库管理
不复制完整工作流管理
不复制完整工具管理
不为了摆脱旧 import 而新增重复 RuntimeModelResolver / RuntimeVectorStore / RuntimeWorkflowExecutor
```

## 运行时能力边界

`ai-runtime` 可以调度能力，但不等于把所有底层能力都重写一遍。

第一版不新增通用中转层或适配层目录。当前已经存在且运行稳定的 LLM、RAG、Tool、Workflow、Safety 底层服务，可以先作为运行时 Handler 的依赖保留。

关键要求：

```text
ai-runtime 主链不直接依赖旧 ChatService、旧 AgentRuntimeService、旧 AgentPlanService、旧 AgentExecutorService、旧 Composer。
ai-runtime Handler 不散落默认模型、默认知识库、默认工具、环境变量兜底。
旧能力如果要搬迁，必须按能力逐个迁移，不为所有能力一次性新增中转层。
```

## V2 目标链路

### 普通对话

```text
POST /chat 或 /chat/stream
-> modules/chat
-> 输入安全检查
-> 普通会话处理
-> 保存 user message
-> ai-runtime Chat capability
-> LLM 调用能力
-> 输出安全检查
-> 保存 assistant message
-> 返回 HTTP 或 SSE
```

普通对话不自动走 RAG。

### Agent 对话

```text
POST /agent/chat 或 /agent/chat/stream
-> modules/agent-chat
-> 输入安全检查
-> Agent 会话处理
-> 保存 user message
-> ai-runtime AgentRuntime
-> ContextBuilder
-> CapabilityResolver
-> Planner / Router
-> Validator
-> Executor
-> Handler
-> Composer
-> Trace
-> 输出安全检查
-> 保存 assistant message
-> 返回 HTTP 或 SSE
```

Agent 对话可以根据 Agent 配置和用户请求选择：

```text
chat
rag
tool
workflow
```

当前源码状态：

```text
当前后端只暴露 POST /agent/chat/stream。
当前 Vue2 前端已调用 POST /agent/chat/stream。
POST /agent/chat/stream-v2 已删除，不再保留兼容入口。
```

## 第一版执行边界

第一版只做入口和职责收敛，不做通用运行时包装抽象。

第一版允许暂时保留的旧底层依赖：

```text
ModelResolverService
LlmService
SensitiveWordCheckerService
KnowledgeQAService
DefaultToolExecutor
WorkflowRuntimeService
```

第一版不搬：

```text
VectorStoreService
EmbeddingService
KnowledgeEvidenceService
KnowledgeAnswerGuardService
WorkflowExecutorService
WorkflowValidatorService
WorkflowRunLoggerService
AIRegistry
knowledge-bot/ai/tools 整包
```

这批能力只能在后续确认有真实 V2 调用链时，再决定是否迁入 `ai-runtime` 或抽成公共底层。

## 分阶段计划

### 阶段 0：冻结旧方向并修正文档

目标：明确 V2 不是旧代码全量搬迁。

执行内容：

```text
更新本文为唯一权威计划。
标记旧阶段计划中过时的 ai-admin、纯目录搬迁、复制 ai-engine 思路。
不修改源码。
不修改数据库。
```

验收标准：

```text
本文明确五目录边界。
本文明确 ai-runtime 不全量复制旧能力。
本文明确旧代码删除需要迁移验收。
```

### 阶段 1：补边界合同测试

目标：先让测试约束正确方向，避免再次把旧能力复制到 `ai-runtime`。

建议新增或更新：

```text
test/ai-v2-directory-boundary-contract.test.cjs
test/ai-v2-runtime-boundary-contract.test.cjs
test/ai-v2-entry-contract.test.cjs
```

验收点：

```text
src/modules/chat 必须是普通对话入口落点。
src/modules/agent-chat 必须是 Agent 对话入口落点。
src/modules/ai-config 必须是 AI 基础配置落点。
src/modules/knowledge 必须是知识资产管理落点。
src/ai-runtime 不允许出现完整复制型目录扩张断言。
V2 测试不再把 modules/knowledge-bot/ai 纳入 V2 运行链路。
```

禁止：

```text
不为了让测试通过创建假 Service。
不为了让测试通过复制旧实现。
```

验证命令：

```powershell
cd F:\公司项目\node-vue2-vue3\nestjs-prisma
node --test test/ai-v2-directory-boundary-contract.test.cjs
node --test test/ai-v2-runtime-boundary-contract.test.cjs
node --test test/ai-v2-entry-contract.test.cjs
npx.cmd tsc --noEmit
git diff --check
```

### 阶段 2：建立普通对话入口

目标：让 `src/modules/chat` 真正承担普通对话，而不是空目录。

迁移或新增范围：

```text
src/modules/chat/chat.module.ts
src/modules/chat/chat.controller.ts
src/modules/chat/chat.service.ts
src/modules/chat/dto/chat.dto.ts
src/modules/chat/persistence/chat-conversation.repository.ts
```

暂定外部路径需单独确认：

```text
POST /chat
POST /chat/stream
```

本阶段不做：

```text
不迁移 Agent 对话
不自动 RAG
不执行工具
不执行工作流
不修改 Prisma schema
```

验收标准：

```text
普通对话入口不依赖 Agent 配置。
普通对话不读取 knowledgeEnabled、toolCodes、workflowCode。
普通对话历史和消息落库闭环清楚。
模型调用只通过已确认的统一模型入口。
第一版不新增 `/chat/stream`。
```

### 阶段 3：收敛 Agent 对话入口

目标：让 `src/modules/agent-chat` 成为唯一 Agent 对话和会话入口。

迁移范围：

```text
src/modules/knowledge-bot/chat
-> src/modules/agent-chat/chat
已完成：旧 chat 入口文件已移除，当前 Agent 流式入口在 agent-chat。

src/modules/knowledge-bot/conversation
-> src/modules/agent-chat/conversation
已完成：/agent/conversation/* Controller、Service、DTO 已迁入 agent-chat。
```

外部路径优先保持：

```text
POST /agent/chat
POST /agent/chat/stream
GET /agent/conversation/list
POST /agent/conversation/create
GET /agent/conversation/detail
POST /agent/conversation/rename
POST /agent/conversation/delete
```

本阶段不做：

```text
不改数据库
不切前端新路径
不删除 knowledge-bot 其他工具代码
不把旧 Agent 主流程作为 V2 长期依赖
```

验收标准：

```text
/agent/chat/stream 的 Controller 位于 modules/agent-chat。
/agent/conversation/* 的 Controller 位于 modules/agent-chat。
modules/agent-chat Controller 不直接依赖 LLM、Vector、Tool、Workflow。
输出安全检查发生在 assistant message 保存前。
旧 knowledge-bot/chat 和 conversation 已清出正式源码。
前端已从 /agent/chat/stream-v2 切换到 /agent/chat/stream，后端兼容入口已同步删除。
```

### 阶段 4：建立 ai-runtime 主链和端口

目标：建立干净的 Agent Runtime 主链，不复制旧底层能力。

建议文件：

```text
src/ai-runtime/agent-runtime.service.ts
src/ai-runtime/agent-runtime.types.ts
src/ai-runtime/context/agent-context.builder.ts
src/ai-runtime/context/agent-context.types.ts
src/ai-runtime/capability/capability-resolver.service.ts
src/ai-runtime/capability/capability.types.ts
src/ai-runtime/planner/agent-planner.service.ts
src/ai-runtime/planner/agent-planner.types.ts
src/ai-runtime/validator/agent-plan-validator.service.ts
src/ai-runtime/executor/agent-capability-executor.service.ts
src/ai-runtime/executor/handlers/chat.handler.ts
src/ai-runtime/executor/handlers/rag.handler.ts
src/ai-runtime/executor/handlers/tool.handler.ts
src/ai-runtime/executor/handlers/workflow.handler.ts
src/ai-runtime/composer/agent-composer.service.ts
src/ai-runtime/events/agent-event.types.ts
src/ai-runtime/adapter/sse-event.adapter.ts
src/ai-runtime/trace/agent-trace.service.ts
```

本阶段只允许主链和必要 Handler。

禁止新增：

```text
src/ai-runtime/model/runtime-model-resolver.service.ts
src/ai-runtime/vector/runtime-vector-store.service.ts
src/ai-runtime/embedding/runtime-embedding.service.ts
src/ai-runtime/knowledge/runtime-knowledge-qa.service.ts
src/ai-runtime/workflow/runtime-workflow-executor.service.ts
src/ai-runtime/tools/runtime-ai.registry.ts
```

除非后续单独确认某个旧能力必须迁入，并说明为什么当前直接依赖旧底层服务已经无法满足边界。

验收标准：

```text
AgentRuntime 主链清晰。
Planner / Router 输出必须经过 Validator。
Executor 只调度 Handler，不堆具体业务实现。
Handler 不复制底层能力实现。
不新增通用中转目录。
```

### 阶段 5：收敛 AI 配置中心

目标：把 AI 基础配置逐步收敛到 `src/modules/ai-config`。

候选迁移：

```text
src/modules/ai-platform/model-provider
-> src/modules/ai-config/model-provider

src/modules/ai-platform/model-config
-> src/modules/ai-config/model-config

src/modules/ai-platform/agent
-> src/modules/ai-config/agent
```

已在目标目录的内容：

```text
src/modules/ai-config/prompt
src/modules/ai-config/sensitive-word
```

待确认：

```text
workflow 管理是否归入 ai-config
tool 管理是否归入 ai-config
skill-package 是否归入 ai-config
```

本阶段不做：

```text
不改 /ai-platform/* 外部路径，除非前端同步确认。
不改 Prisma schema。
不删除 ai-platform，除非所有子模块迁移验收通过。
```

验收标准：

```text
配置 CRUD 路径保持兼容。
Agent 配置仍能被 ai-runtime ContextBuilder 读取。
Provider -> Model config -> Agent -> Runtime 链路唯一。
旧 ai-platform 对应子目录引用清零后才允许删除。
```

### 阶段 6：收敛知识资产管理

目标：让 `src/modules/knowledge` 成为唯一知识资产管理目录。

当前已有：

```text
src/modules/knowledge/knowledge-base
```

本阶段重点：

```text
确认旧 knowledge-bot/knowledge-base 是否已经清空或迁移。
确认知识库管理、文件、Chunk、向量入库、检索测试都只在 modules/knowledge。
确认运行时 RAG 只使用已确认的 RAG 能力入口，不反向依赖 Controller。
```

本阶段不做：

```text
不把 RAG 最终回答放进 modules/knowledge。
不让 modules/knowledge 调用 AgentRuntime。
不新增 Rerank、多路召回或复杂检索策略。
```

验收标准：

```text
知识资产管理入口唯一。
RAG 运行时和知识库管理边界清楚。
旧 knowledge-bot 知识管理引用清零后才允许删除。
```

### 阶段 7：旧目录删除

目标：在新链路真实接管后，删除旧目录。

删除候选：

```text
src/modules/knowledge-bot
src/modules/ai-platform
src/ai-engine
```

删除前必须逐项满足：

```text
新目录已注册到 Nest 模块。
外部接口路径已保持兼容或前端已同步切换。
rg 搜索无旧路径业务 import。
focused 合同测试通过。
TypeScript 检查通过。
真实需要的浏览器 / SSE / 模型 / 数据库验证已按范围执行。
```

数据库相关说明：

```text
删除目录不等于删除表。
任何 Prisma schema、migration、字段、枚举、seed 变更都必须单独确认并执行数据库闭环。
```

## 需要立即避免的错误方向

```text
不要新增 RuntimeModelResolverService 来复制 ModelResolverService。
不要新增 RuntimeVectorStoreService 来复制 VectorStoreService。
不要新增 RuntimeWorkflowExecutorService 来复制 WorkflowExecutorService。
不要新增 RuntimeAIRegistry 来复制 AIRegistry。
不要让 knowledge-bot 工具同时注册到旧注册表和新注册表。
不要把 test 写成“ai-runtime 必须拥有所有底层实现”。
不要把 src/modules/chat 长期留成空目录。
不要把 ai-platform 改名为 ai-admin；本计划目标是 ai-config。
```

## 测试策略

先测试稳定产品合同，不测试变量名、三元表达式或某个临时实现细节。

建议合同测试覆盖：

```text
五目录存在且职责边界正确。
普通 chat 不读取 Agent 配置。
Agent chat 不直接依赖底层 LLM / Vector / Tool / Workflow。
ai-runtime 主链不复制旧能力实现。
不新增通用中转目录来包装所有能力。
Planner / Router 输出必须经过 Validator。
Executor 只能调度 Handler。
输出安全检查发生在 assistant message 保存前。
旧目录删除前引用必须清零。
```

建议基础验证命令：

```powershell
cd F:\公司项目\node-vue2-vue3\nestjs-prisma
node --test test/ai-v2-directory-boundary-contract.test.cjs
node --test test/ai-v2-runtime-boundary-contract.test.cjs
node --test test/ai-v2-entry-contract.test.cjs
npx.cmd tsc --noEmit
git diff --check
```

真实验证必须单独说明：

```text
静态测试不等于真实模型调用。
TypeScript 通过不等于数据库字段存在。
HTTP 200 不等于浏览器 SSE 消费正常。
构建通过不等于前端页面已验证。
```

## 数据库边界

本文当前不计划修改 Prisma schema。

以下事项如后续出现，必须停止当前阶段并单独确认数据库闭环：

```text
新增 AiConversation.type
新增 AiConversation.agentId
修改 AiConversation.mode
新增 AiAgentExecutionLog 字段
新增模型、工具、工作流、Trace、Memory、Evaluation 表
删除任何 AI 相关字段或表
```

闭环要求：

```text
确认目标数据库来源
生成或更新 Prisma migration
执行 migrate:deploy
执行 prisma:generate
执行 migrate:status
用查询、接口、测试或构建确认关键字段可用
```

## 当前建议下一步

下一步优先收敛 Agent 运行时内部边界。

原因：

```text
当前入口口径已经明确：/chat 是普通聊天，/agent/chat 是 Agent。
`POST /chat` 第一版已经建立，可以把普通对话从 Agent 兜底中拆出来。
`/agent/conversation/*` 已迁入 agent-chat。
Vue2 前端已切换到 /agent/chat/stream，后端不再保留 /agent/chat/stream-v2 兼容入口。
```

下一步不做：

```text
不删除 ai-engine
不删除 knowledge-bot 工具代码
不改 Prisma schema
不切前端旧 SSE 入口
不继续复制旧底层能力到 ai-runtime
```
