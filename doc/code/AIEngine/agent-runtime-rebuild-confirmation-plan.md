# 智能体平台目录结构与运行链路重构确认计划

## 文档目的

本文是智能体平台后端重构的确认文档，用于确认当前剩余迁移范围、模块职责、调用方向、接口边界、文件迁移范围和验收口径。

已完成或不作为下一步执行内容的旧阶段说明已删除。后续实施以本文件的“当前剩余迁移范围”和对应阶段计划为准。

本文本身不直接授权数据库迁移、接口破坏性调整或源码删除。真正执行前仍需按阶段计划和验收项推进。

## 范围原则

本次重构以现有能力边界整理为目标，不新增 AI 平台能力。

当前不包含：

```text
不实现 Rerank
不实现 Evaluation
不实现 Memory
不实现 Multi Agent
不实现自主循环 Agent
不实现 LLM 自由规划
不实现自动 Prompt 优化
不实现 Agent 自学习
不新增 AiEvaluation 表
不新增 AiTrace 表
不新增 AiMemory 表
```

下一步目标是修正智能体对话链路职责，不扩展完整 AI 平台能力。

## 核心结论

当前历史结构把业务入口、运行引擎、配置管理和知识库业务混在一起：

```text
src/ai-engine
src/modules/knowledge-bot
src/modules/ai-platform
```

目标结构按职责分层：

```text
业务入口层
-> 能力运行层
-> 配置管理层 / 业务资源层
```

目标目录方向：

```text
src/
  modules/
    ai-chat/       普通 AI 聊天入口，后续单独确认
    agent-chat/    智能体聊天入口
    ai-admin/      AI 配置管理，后续单独迁移
    knowledge/     知识库业务管理

  ai-runtime/      AI 执行能力层，后续纯目录迁移
```

当前下一步不直接把 `src/ai-engine` 改名为 `src/ai-runtime`，先在 `src/ai-engine/agent` 内完成智能体运行链路职责拆分。

## 模块职责

### modules/agent-chat

职责：

```text
智能体聊天 HTTP 入口
用户身份读取
请求参数校验
智能体会话管理
用户消息和助手消息保存
SSE 协议输出
调用 ai-engine/agent
```

禁止：

```text
不在 Controller 判断用户意图
不在 Controller 做 RAG 检索
不在 Controller 选择工具
不在 Controller 拼 Agent prompt
不在 Controller 执行工作流
不把 Controller 写成 Agent 大脑
```

### modules/knowledge

职责：

```text
Knowledge Base 管理
知识库列表和详情
文件上传
文件替换
文件下载
Chunk 管理
向量生成流程
检索测试
```

禁止：

```text
modules/knowledge 不负责 Agent 意图识别
modules/knowledge 不负责 Agent 最终回答
modules/knowledge 不直接编排 Tool 或 Workflow
```

### ai-engine / 后续 ai-runtime

职责：

```text
AI 执行能力层
Agent 执行
LLM 调用
RAG 检索增强回答
Tool 执行
Workflow 执行
Embedding
Vector 检索
Safety / Guardrails 能力
```

它不是 HTTP 业务模块，不暴露 Controller。

## RAG 与 Knowledge 的边界

RAG 不等于知识库。

```text
modules/knowledge
  表示知识库业务管理，负责 Knowledge Base、文件、Chunk、向量生成流程。

ai-engine/rag 或后续 ai-runtime/rag
  表示运行时检索增强能力，负责检索、证据整理、回答生成和答案 Guard。
```

运行能力不再命名为 `knowledge`，统一按 `rag` 表达，避免和 `modules/knowledge` 混淆。

本轮不新增 Rerank、多路召回或复杂检索策略。

## Safety / Guardrails 边界

当前已有实现：

```text
输入敏感词检测
输出敏感词检测
```

下一步只复用已有敏感词能力，不新增内容审核、权限控制或数据脱敏能力。

## SkillPackage 边界

`SkillPackage` 属于配置聚合层概念，不是 Runtime 直接执行对象。

Runtime 不直接执行 Skill。Skill 只影响 Agent 可用能力集合，最终执行对象仍然是具体 Tool、Workflow、RAG 或 LLM。

## Trace 边界

Agent 一次执行链路在概念上称为 Trace。

当前持久化仍复用：

```text
AiAgentExecutionLog
```

本轮不新增 `AiTrace` 表。若后续补 Trace 字段，必须单独确认数据库闭环。

## 当前剩余迁移范围

已经存在或已完成的内容，不再作为本文待办：

```text
src/modules/agent-chat 目录骨架已经存在
/agent/chat 外部接口已经存在
/agent/chat/stream 外部接口已经存在
/agent/conversation/* 外部接口已经存在
Vue2 聊天页已经调用 /agent/chat/stream 和 /agent/conversation/*
基础配置和知识库管理迁移不再纳入本轮智能体聊天任务
```

当前仍需迁移：

```text
src/modules/knowledge-bot/chat
-> src/modules/agent-chat/chat

src/modules/knowledge-bot/conversation
-> src/modules/agent-chat/conversation

src/ai-engine/agent/agent-plan.service.ts
-> src/ai-engine/agent/context/agent-context.builder.ts
-> src/ai-engine/agent/router/agent-router.service.ts
-> src/ai-engine/agent/validator/agent-validator.service.ts

src/ai-engine/agent/agent-executor.service.ts
-> src/ai-engine/agent/executor/agent-executor.service.ts

src/ai-engine/agent/agent-response-composer.service.ts
-> src/ai-engine/agent/composer/agent-composer.service.ts

src/ai-engine/agent/agent-execution-logger.service.ts
-> src/ai-engine/agent/trace/agent-trace.service.ts
```

本轮不迁移：

```text
src/modules/ai-platform/agent
src/modules/ai-chat
src/ai-engine -> src/ai-runtime
workflow 管理页面
tool 管理页面
skill-package 管理页面
```

## 当前链路事实

当前 `/agent/chat` 链路：

```text
POST /agent/chat
-> knowledge-bot/chat/ChatController
-> ChatService
-> 输入敏感词检测
-> AgentRuntimeService.resolve(agentCode)
-> ConversationService 获取或创建会话
-> 加载历史消息
-> 保存 user message
-> AgentRuntimeService.execute()
-> buildContext()
-> AgentPlanService.createPlan()
-> AgentPlanService.validate()
-> AgentExecutorService.execute()
-> AgentResponseComposerService.compose()
-> 输出敏感词检测
-> 保存 assistant message
-> 返回
```

当前问题：

```text
对外已经是 /agent/chat，但内部仍放在 knowledge-bot/chat。
ChatService 同时承担会话闭环和运行时解析，边界偏宽。
AgentPlanService 名称像 Planner，但实际是固定优先级路由和校验。
运行时 route 仍使用 knowledge 命名，容易和 modules/knowledge 知识库管理混淆。
```

## 目标 Agent 对话链路

目标链路：

```text
POST /agent/chat 或 /agent/chat/stream
-> modules/agent-chat/ChatController
-> modules/agent-chat/ChatService
-> 输入 Safety / Guardrails 检查
-> 获取或创建智能体会话
-> 读取历史消息
-> 保存 user message
-> ai-engine/agent/AgentRuntimeService
-> AgentContextBuilder
-> AgentRouter
-> AgentValidator
-> AgentExecutor
-> AgentComposer
-> AgentTrace
-> 输出 Safety / Guardrails 检查
-> 保存安全后的 assistant message
-> 返回普通响应或 SSE
```

输出保存顺序必须保持：

```text
生成回答
-> 输出 Safety / Guardrails 检查
-> 保存安全后的 assistant message
-> 返回用户
```

禁止保存未通过输出检查的原始 assistant 内容。

## AgentContext

`AgentContext` 是一次 Agent 运行的可信上下文，不是普通 DTO。

建议结构：

```text
AgentContext
  agent
    id
    code
    name

  user
    id
    roles
    permissions

  conversation
    id
    agentCode

  history
    recentMessages

  prompt
    promptId
    systemPrompt
    promptSnapshot

  model
    provider
    modelName
    temperature
    topP

  capabilities
    rag
      enabled
      knowledgeBaseIds
      tags
      strict

    tools
      allowedToolCodes

    workflow
      workflowCode

  metadata
    requestId
    channel
    createdAt
```

原则：

```text
AgentRouter 可以读取 AgentContext。
AgentValidator 只信任 AgentContext。
AgentExecutor 只能执行 Validator 通过的 route。
```

## AgentRouter 定位

本阶段要走 `AgentRouter`，但它不是 LLM Planner。

`AgentRouter` 只根据 `AgentContext`、Agent 配置、能力绑定和显式请求参数选择当前允许执行的单一步骤。

支持 route：

```text
chat
rag
tool
workflow
```

第一阶段选择规则：

```text
1. Agent 绑定 workflowCode
   -> route = workflow

2. 请求显式指定 requestedToolCode，并且 Agent 授权该工具
   -> route = tool

3. Agent 开启 knowledgeEnabled，或当前 mode = knowledge
   -> route = rag

4. 其他情况
   -> route = chat
```

`AgentRouter` 不负责：

```text
自然语言意图理解
LLM 自由规划
多步骤任务拆解
自主循环执行
发明工具、工作流或知识库
```

## Conversation 边界

Conversation 不属于 Agent 大脑。

Conversation 职责：

```text
创建会话
校验会话归属
保存用户消息
保存助手消息
读取历史消息
清理非法历史格式
软删除会话
```

`ConversationService` 不应该：

```text
不读取 Agent 配置
不调用 AgentRouter
不调用 AgentExecutor
不调用 Tool
不自动 RAG
```

## 接口边界确认

本轮保持现有外部路径：

```text
POST /agent/chat
POST /agent/chat/stream
GET /agent/conversation/list
POST /agent/conversation/create
GET /agent/conversation/detail
POST /agent/conversation/rename
POST /agent/conversation/delete
```

本轮不新增：

```text
POST /ai/chat
POST /ai/chat/stream
```

当前 `/agent/chat` 仍支持不传 `agentCode` 后走默认对话。本轮默认保持这个兼容行为。

如果后续决定强制 `agentCode` 必传，必须单独确认并同步设计普通 AI 对话入口：

```text
/agent/chat 不再承担普通 AI 对话
/ai/chat 承担普通 AI 对话
Vue2 聊天页发送智能体对话时必须带 agentCode
旧的 resolveDefault 默认对话路径不再用于 /agent/chat
```

## 文件确认清单

### 智能体入口迁移

| 文件 | 目标 |
| --- | --- |
| `src/modules/agent-chat/agent-chat.module.ts` | 新增智能体聊天模块 |
| `src/modules/agent-chat/chat/chat.controller.ts` | 迁移 `/agent/chat` 和 `/agent/chat/stream` |
| `src/modules/agent-chat/chat/chat.service.ts` | 迁移智能体对话外层编排 |
| `src/modules/agent-chat/chat/dto/chat.dto.ts` | 迁移智能体对话 DTO，暂不强制 agentCode |
| `src/modules/agent-chat/conversation/conversation.controller.ts` | 迁移 `/agent/conversation/*` |
| `src/modules/agent-chat/conversation/conversation.service.ts` | 迁移智能体会话服务 |
| `src/modules/agent-chat/conversation/dto/conversation.dto.ts` | 迁移智能体会话 DTO |
| `src/modules/knowledge-bot/knowledge-bot.module.ts` | 移除 Chat / Conversation 注册，只保留工具注册 |
| `src/app.module.ts` | 注册 `AgentChatModule` |
| `src/common/swagger/swagger-docs.ts` | AI 分组加入 `AgentChatModule` |

迁移验证通过后删除：

```text
src/modules/knowledge-bot/chat
src/modules/knowledge-bot/conversation
```

### Agent 内核拆分

| 文件 | 目标 |
| --- | --- |
| `src/ai-engine/agent/agent-runtime.service.ts` | 保留为运行时总入口，调用 Context / Router / Validator / Executor / Composer / Trace |
| `src/ai-engine/agent/context/agent-context.builder.ts` | 从 Agent 配置、用户、会话、历史构建可信 `AgentContext` |
| `src/ai-engine/agent/context/agent-context.types.ts` | `AgentContext` 类型 |
| `src/ai-engine/agent/router/agent-router.service.ts` | 确定性配置路由 |
| `src/ai-engine/agent/router/agent-router.types.ts` | Router 输入输出类型 |
| `src/ai-engine/agent/validator/agent-validator.service.ts` | 根据 `AgentContext` 校验 route 权限和参数 |
| `src/ai-engine/agent/executor/agent-executor.service.ts` | 迁移现有执行能力 |
| `src/ai-engine/agent/composer/agent-composer.service.ts` | 迁移最终回答组织能力 |
| `src/ai-engine/agent/trace/agent-trace.service.ts` | 复用 `AiAgentExecutionLog` 做请求级记录 |
| `src/ai-engine/ai-engine.module.ts` | 注册新增 provider |

新职责文件接管后删除：

```text
src/ai-engine/agent/agent-plan.service.ts
src/ai-engine/agent/agent-executor.service.ts
src/ai-engine/agent/agent-response-composer.service.ts
src/ai-engine/agent/agent-execution-logger.service.ts
```

## 数据库模型确认

本轮默认不改 Prisma schema。

本轮继续兼容现有会话字段，例如 `agentCode`、`mode` 和消息元数据。

不新增：

```text
AiEvaluation
AiTrace
AiMemory
```

如果后续单独确认以下字段，必须执行数据库闭环：

```text
AiConversation.type = CHAT | AGENT
AiConversation.agentId nullable
AiAgentExecutionLog 补 requestId / capability / toolCode / workflowCode / knowledgeBaseIds / error
```

数据库闭环要求：

```text
确认目标数据库
生成 Prisma migration
执行 migrate:deploy
执行 prisma:generate
执行 migrate:status
查询关键字段确认
```

## 禁止依赖关系

必须禁止：

```text
modules/agent-chat/controller -> VectorStoreService
modules/agent-chat/controller -> DefaultToolExecutor
modules/agent-chat/controller -> WorkflowRuntimeService
modules/agent-chat/controller -> LlmService
modules/agent-chat/service -> VectorStoreService
modules/agent-chat/service -> DefaultToolExecutor
modules/agent-chat/service -> WorkflowRuntimeService
modules/agent-chat/service -> LlmService
modules/ai-admin -> AgentRouter
modules/knowledge -> AgentRouter
ai-engine/agent -> modules/* Controller
```

允许：

```text
modules/agent-chat/service -> ai-engine/agent/AgentRuntimeService
ai-engine/agent -> ai-engine/orchestrator
ai-engine/agent -> ai-engine/tools
ai-engine/agent -> ai-engine/workflow
ai-engine/agent -> ai-engine/llm
```

## 测试文件确认

建议新增或更新：

| 文件 | 用途 |
| --- | --- |
| `test/ai-agent-runtime-routes-contract.test.cjs` | 验证 `/agent/chat` 和 `/agent/conversation` 迁到 `modules/agent-chat` 后路径不变 |
| `test/ai-agent-runtime-clean-contract.test.cjs` | 验证 ChatService 只做外层闭环，AgentRuntime 使用新职责文件 |
| `test/ai-chat-stream-error-contract.test.cjs` | 验证 Agent SSE 错误仍转为 error event 并输出 `[DONE]` |
| `test/ai-chat-history-cleanup-contract.test.cjs` | 验证会话历史清理和归属校验仍保留 |
| `test/ai-agent-router-route-contract.test.cjs` | 验证 `chat`、`rag`、`tool`、`workflow` route 选择 |
| `test/ai-agent-validator-contract.test.cjs` | 验证越权工具、未绑定工作流、未绑定 RAG 范围不能执行 |

## 当前执行大纲

本文后续只按以下顺序推进：

```text
1. 补充或更新智能体聊天迁移合同测试。
2. 迁移 knowledge-bot/chat 到 modules/agent-chat/chat。
3. 迁移 knowledge-bot/conversation 到 modules/agent-chat/conversation。
4. 注册 AgentChatModule，移除 KnowledgeBotModule 中的 Chat / Conversation 注册。
5. 拆分 AgentContextBuilder、AgentRouter、AgentValidator、AgentExecutor、AgentComposer、AgentTrace。
6. 更新 import、测试路径和 Swagger 分组。
7. 验证 /agent/chat、/agent/chat/stream、/agent/conversation/*。
8. 验证通过后删除旧 chat / conversation 和旧 Agent 聚合文件。
```

验收命令：

```powershell
cd F:\公司项目\node-vue2-vue3\nestjs-prisma
node --test test/ai-agent-runtime-routes-contract.test.cjs
node --test test/ai-agent-runtime-clean-contract.test.cjs
node --test test/ai-chat-stream-error-contract.test.cjs
node --test test/ai-chat-history-cleanup-contract.test.cjs
node --test test/ai-agent-router-route-contract.test.cjs
node --test test/ai-agent-validator-contract.test.cjs
npx.cmd tsc --noEmit
git diff --check
```

## 仍需确认的问题

1. 后续是否强制 `/agent/chat` 和 `/agent/chat/stream` 必传 `agentCode`。
2. 后续是否新增普通 AI 对话入口 `/ai/chat` 和 `/ai/chat/stream`。
3. 后续是否修改数据库，新增或确认 `AiConversation.type` 和 `AiConversation.agentId`。
4. 后续是否同步补齐 `AiAgentExecutionLog` 的 Trace 字段。
5. 后续是否用于纯目录迁移 `src/ai-engine -> src/ai-runtime`。
