# 智能体平台目录结构与运行链路重构确认计划

## 文档目的

本文是智能体平台后端重构的唯一确认文档，用于确认最终目录结构、模块职责、调用方向、接口边界、文件迁移范围、数据模型方向和实施阶段。

本文不是实施计划，不直接授权编码、迁移数据库或移动文件。本文确认后，再基于它生成可执行实施计划。

## 范围原则

本次重构以现有能力边界整理为目标，不新增 AI 平台能力。所有目录、模块和命名优先采用 AI 行业通用术语，但仅调整已有能力归属，不扩展未来能力。

当前阶段不包含：

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

第一阶段目标是稳定 Agent Runtime，不是扩展完整 AI 平台能力。

## 核心结论

当前历史结构是按功能逐步堆出来的：

```text
src/ai-engine
src/modules/knowledge-bot
src/modules/ai-platform
```

这些名字已经混合了业务入口、运行引擎、配置管理和知识库业务。目标结构应按平台职责重新建模：

```text
业务入口层
-> 能力运行层
-> 配置管理层 / 业务资源层
```

最终目录目标：

```text
src/
  modules/
    ai-chat/
    agent-chat/
    ai-admin/
    knowledge/

  ai-runtime/
```

第一阶段不直接把 `src/ai-engine` 改名为 `src/ai-runtime`。第一阶段先完成运行链路隔离和 Agent 内部职责拆分；第二阶段再做纯目录迁移。

## 最终架构

目标架构：

```text
src/
  modules/
    ai-chat/
      普通 AI 聊天入口

    agent-chat/
      智能体聊天入口

    ai-admin/
      AI 配置管理

    knowledge/
      知识库业务管理

  ai-runtime/
    AI 执行能力层
```

调用关系：

```text
modules/ai-chat
  -> ai-runtime/llm
  -> ai-runtime/safety

modules/agent-chat
  -> ai-runtime/agent
       -> ai-runtime/rag
       -> ai-runtime/tool
       -> ai-runtime/workflow
       -> ai-runtime/llm
       -> ai-runtime/safety

modules/ai-admin
  -> Prisma 配置表

modules/knowledge
  -> 知识库业务表
  -> ai-runtime/embedding
  -> ai-runtime/vector
```

禁止反向依赖：

```text
ai-runtime 不依赖 modules/agent-chat
ai-runtime 不依赖 modules/ai-chat
ai-runtime 不依赖 modules/ai-admin Controller
ai-runtime 不依赖 modules/knowledge Controller
```

运行时可以依赖 Prisma、底层能力服务和明确的配置读取逻辑，但不能依赖 HTTP Controller。

## 模块职责

### modules/ai-chat

职责：

```text
普通 AI 对话入口
普通 AI 会话编排
普通 AI 消息保存
调用 LLM 生成回答
输入和输出 Safety / Guardrails 检查
```

禁止：

```text
不读取 AiAgent
不调用 AgentRouter
不调用 AgentExecutor
不自动 RAG
不自动调用 Tool
不自动执行 Workflow
```

### modules/agent-chat

职责：

```text
智能体聊天 HTTP 入口
用户身份读取
参数校验
智能体会话管理
用户消息和助手消息保存
SSE 协议输出
调用 ai-runtime/agent
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

设计目标：

```text
Web 聊天、开放 API、定时任务等入口都可以复用 ai-runtime/agent。
agent-chat 只是其中一个业务入口。
```

### modules/ai-admin

职责：

```text
AI 配置管理
智能体配置
提示词配置
模型配置
工具列表
工作流配置
敏感词配置
技能包配置
```

第一阶段接口路径保持：

```text
/ai-platform/*
```

内部目录后续可从：

```text
src/modules/ai-platform
```

迁移为：

```text
src/modules/ai-admin
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

第一阶段接口路径建议保持：

```text
/knowledge-bot/knowledge-base/*
```

内部目录后续可从：

```text
src/modules/knowledge-bot/knowledge-base
```

迁移为：

```text
src/modules/knowledge/knowledge-base
```

禁止：

```text
modules/knowledge 不负责 Agent 意图识别
modules/knowledge 不负责 Agent 最终回答
modules/knowledge 不直接编排 Tool 或 Workflow
```

### ai-runtime

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

ai-runtime/rag
  表示运行时检索增强能力，负责检索、证据整理、回答生成和答案 Guard。
```

因此运行能力不再命名为 `ai-runtime/knowledge`，统一命名为 `ai-runtime/rag`。

当前 `src/ai-engine/knowledge-qa` 的能力本质是运行时 RAG，不是知识库管理模块。第一阶段建议在 `src/ai-engine` 内完成概念改名：

```text
src/ai-engine/knowledge-qa
-> src/ai-engine/rag

knowledge-qa.service.ts
-> rag.service.ts

knowledge-evidence.service.ts
-> rag-evidence.service.ts

knowledge-answer-guard.service.ts
-> rag-answer-guard.service.ts

knowledge.types.ts
-> rag.types.ts
```

这是命名和归属清理，不新增新的 RAG 能力，不新增 Rerank。

RAG 内部运行职责：

```text
Embedding Query
-> Retrieval
-> Evidence 整理
-> Context 拼接
-> LLM 回答
-> Answer Guard
```

第一阶段 `Retrieval` 使用现有向量检索能力承载，也就是当前 `vector-store.service.ts` 负责的检索能力。它以前可能被叫作 knowledge search，重构后统一归入运行时 RAG。

第一阶段不实现：

```text
Rerank
多路召回
复杂检索策略
```

## Safety / Guardrails 边界

`safety` 目录表示 Safety / Guardrails 能力。

当前已有实现：

```text
输入敏感词检测
输出敏感词检测
```

未来可扩展方向：

```text
内容审核
权限控制
数据脱敏
```

第一阶段只复用已有敏感词能力，不新增内容审核、权限控制或数据脱敏能力。

## SkillPackage 边界

`SkillPackage` 属于配置层概念，不是 Runtime 直接执行对象。

第一阶段关系：

```text
modules/ai-admin
  -> 管理 SkillPackage 配置

AgentContext.capabilities
  -> 接收 SkillPackage 安装后形成的能力绑定结果

ai-runtime/agent
  -> 执行具体 Tool / Workflow / RAG / LLM
```

Runtime 不直接执行 Skill。Skill 只影响 Agent 可用能力集合，最终执行对象仍然是具体 Tool、Workflow、RAG 或 LLM。

第一阶段 `SkillPackage` 定位为配置聚合层。例如：

```text
销售助手技能包
  Tool
    查询订单
    查询库存

  Workflow
    售后流程
```

发布或绑定 Agent 时：

```text
SkillPackage
-> 展开为 capabilities
-> 保存到 Agent 配置
-> Runtime 读取 AgentContext.capabilities
```

因此开发时不要把 `SkillPackage` 当成一个可执行 runtime 节点。

## Model 与 Model Gateway 边界

`model` 模块第一阶段负责：

```text
Provider 解析
Model 配置读取
OpenAI Compatible 参数适配
```

`model` 不负责模型路由，也不负责成本统计。

第一阶段保留现有 `llm` 和 `model` 能力，不新增 `model-gateway` 目录。

未来如果需要统一多模型接入，可以单独增加：

```text
ai-runtime/model-gateway
```

未来职责可以包括：

```text
模型路由
Provider 选择
OpenAI 兼容接口适配
限流
成本统计
```

这些不属于第一阶段实施范围。

## Trace 边界

Agent 一次执行链路在概念上称为 Trace。

Log 和 Trace 的区别：

```text
Log
  记录系统事件。

Trace
  记录一次 AI 请求的完整执行链路。
```

当前数据库表：

```text
AiAgentExecutionLog
```

它是 Trace 的当前持久化实现，不新增 `AiTrace` 表。

Trace 建议记录：

```text
requestId
route
capability
toolCode
workflowCode
knowledgeBaseIds
duration
error
```

一次 Agent 请求的 Trace 例子：

```text
requestId=xxx
-> route=rag
-> knowledgeBaseIds=[A]
-> vector retrieval
-> llm
-> answer guard
-> response
```

## ai-runtime 目标目录

最终目录建议：

```text
src/ai-runtime/
  ai-runtime.module.ts

  agent/
    agent-runtime.service.ts
    agent-runtime.types.ts

    context/
      agent-context.builder.ts
      agent-context.types.ts

    router/
      agent-router.service.ts
      agent-router.types.ts

    validator/
      agent-validator.service.ts

    executor/
      agent-executor.service.ts

    composer/
      agent-composer.service.ts

    trace/
      agent-trace.service.ts

  llm/
    llm.service.ts

  model/
    model-resolver.service.ts

  rag/
    rag.service.ts
    rag-evidence.service.ts
    rag-answer-guard.service.ts
    rag.types.ts

  vector/
    vector-store.service.ts

  embedding/
    embedding.service.ts

  tool/
    tool.executor.ts
    tool.types.ts

  workflow/
    workflow-runtime.service.ts
    workflow-executor.service.ts
    workflow-validator.service.ts
    workflow-run-logger.service.ts
    workflow.types.ts

  safety/
    sensitive-word-checker.service.ts

  core/
    ai.registry.ts
```

`model-gateway/` 是未来扩展目录，第一阶段不创建。

命名边界：

```text
ai-runtime/rag 表示运行时检索增强能力。
modules/knowledge 表示知识库业务管理。
两者不能混。
```

## 分阶段目录迁移策略

### 阶段 1：逻辑隔离，暂不改 ai-engine 名

先保留：

```text
src/ai-engine
```

但在内部整理 Agent 子目录：

```text
src/ai-engine/agent/
  context/
  router/
  validator/
  executor/
  composer/
  trace/
```

阶段目标：

```text
完成普通 AI 和 Agent 入口分离。
完成 AgentContext、AgentRouter、AgentValidator、AgentExecutor、AgentComposer、Trace 职责分离。
第一阶段不做 LLM 自由规划。
第一阶段不做 ai-engine -> ai-runtime 的整体 rename。
```

### 阶段 2：纯目录迁移

只做：

```text
src/ai-engine
-> src/ai-runtime
```

阶段要求：

```text
不改业务逻辑。
只改目录名、import、测试路径、文档路径。
```

### 阶段 3：历史模块改名

将配置和知识库业务目录从历史命名迁移到平台命名：

```text
src/modules/ai-platform
-> src/modules/ai-admin

src/modules/knowledge-bot/knowledge-base
-> src/modules/knowledge/knowledge-base
```

建议接口路径先保持兼容：

```text
/ai-platform/*
/knowledge-bot/knowledge-base/*
```

后续如需改接口路径，再单独做前后端同步迁移。

## 当前链路事实

当前 `/agent/chat` 链路：

```text
POST /agent/chat
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

当前 `AgentPlanService` 本质是固定配置优先级路由：

```text
workflowCode 优先
-> requestedToolCode
-> knowledge.enabled && mode = knowledge
-> chat
```

这不是语义意图识别，也不是复杂任务 Planner。它第一阶段应被重新定位为 `AgentRouter` 的来源之一。

## 目标 Agent 运行链路

第一阶段目标链路：

```text
modules/agent-chat
  -> 接收 /agent/chat 请求
  -> 校验 agentCode
  -> 输入 Safety / Guardrails 检查
  -> 获取或创建 Agent 会话
  -> 加载历史消息
  -> 调用 ai-runtime/agent

ai-runtime/agent
  -> 加载 Agent 配置
  -> ContextBuilder 构建 AgentContext
  -> AgentRouter 根据配置和能力绑定选择 route / capability
  -> AgentValidator 校验 route、能力和参数
  -> AgentExecutor 执行能力
  -> AgentComposer 生成最终回答
  -> Trace 记录执行链路

modules/agent-chat
  -> 输出 Safety / Guardrails 检查
  -> 保存安全后的 assistant message
  -> 返回用户
```

输出保存顺序：

```text
生成回答
-> 输出 Safety / Guardrails 检查
-> 保存安全后的 assistant message
-> 返回用户
```

禁止保存违规原文作为 assistant message。

## AgentContext

`AgentContext` 不是简单配置对象，而是一次 Agent 运行的可信上下文。

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
    type
    agentId

  history
    recentMessages
    summary

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
      strict

    tools
      allowedToolCodes

    workflow
      workflowCode

  variables
    runtimeVariables

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

第一阶段使用 `AgentRouter`，不创建 `AgentPlanner` 目录，不实现复杂任务规划。

`AgentRouter` 职责：

```text
根据 AgentContext 中已有配置、用户请求上下文、Agent 能力绑定关系、请求参数和显式指定能力，
选择当前允许执行的 route。
```

支持 route：

```text
chat
rag
tool
workflow
```

第一阶段路由依据：

```text
Agent 配置
能力绑定关系
请求参数
显式指定能力
```

`AgentRouter` 不负责：

```text
自然语言意图理解
LLM 自由规划
多步骤任务拆解
自主循环执行
发明工具、工作流或知识库
```

它不通过 LLM 自主判断复杂意图。

不要使用：

```text
direct_chat
knowledge 作为运行时 route
```

原因：

```text
direct_chat 是实现视角，chat 是 route。
knowledge 容易和 modules/knowledge 混淆，运行时检索增强能力统一叫 rag。
```

第一阶段限制：

```text
只执行一步 route。
不允许 LLM 自由生成多步任务。
不允许自循环。
不允许 Router 发明工具、工作流或知识库。
```

未来如果需要复杂任务规划，可以单独引入 `AgentPlanner`：

```text
AgentRuntime
-> ContextBuilder
-> AgentContext
-> AgentPlanner
-> Plan
-> AgentValidator
-> AgentExecutor
-> AgentComposer
-> Trace
```

该能力不属于第一阶段。

## 会话数据模型方向

当前 `AiConversation` 和 `AiMessage` 被普通 AI 和智能体共享时，需要能区分会话类型。

建议最小模型方向：

```text
AiConversation
  id
  userId
  type          CHAT | AGENT
  agentId       nullable
  title
  metadata      json nullable
  createdAt
  updatedAt

AiMessage
  id
  conversationId
  role
  content
  metadata
  createdAt
```

推荐使用：

```text
agentId nullable
```

不推荐把 `agentCode` 作为主关联。

原因：

```text
agentCode 是业务编码。
数据库关系应优先绑定 AiAgent.id。
Agent 名称或展示信息变化时，会话关联仍稳定。
```

`metadata` 可用于记录非主关联来源信息：

```json
{
  "channel": "web",
  "device": "pc",
  "source": "agent-chat"
}
```

第一阶段不强制单独新增 `channel` 字段，避免过早固化渠道枚举。

不新增：

```text
AiEvaluation
AiTrace
AiMemory
```

如果执行数据库变更，必须完整闭环：

```text
确认目标数据库
生成 Prisma migration
执行 migrate:deploy
执行 prisma:generate
执行 migrate:status
查询关键字段确认
```

## Conversation 边界

Conversation 是普通 AI 对话和 Agent 对话共享的业务资源，不属于 Agent Runtime。

目标关系：

```text
modules/ai-chat
  -> Conversation 持久化能力

modules/agent-chat
  -> Conversation 持久化能力

ai-runtime/agent
  -> 读取 AgentContext 中已经准备好的 conversation / history
```

后续可以单独抽：

```text
src/modules/conversation
```

但第一阶段不新增该模块。若暂不拆共享模块，也必须在 `AiConversation.type` 和 `agentId nullable` 上预留普通 AI 与 Agent 会话区分。

## 接口边界确认

### 普通 AI 对话

建议新增：

| 接口地址 | 目标模块 | 职责 |
| --- | --- | --- |
| `POST /ai/chat` | `src/modules/ai-chat` | 普通非流式 AI 对话 |
| `POST /ai/chat/stream` | `src/modules/ai-chat` | 普通流式 AI 对话 |

要求：

```text
不读取 Agent
不调用 AgentRouter
不调用 AgentRuntime
不调用 AgentExecutor
不调用 Tool
不自动 RAG
不执行 Workflow
```

普通 AI 也需要会话连续性。第一阶段确定方案：

```text
不新增 /ai/conversation/*
不新增共享 /conversation/*
不新增 modules/conversation

POST /ai/chat 和 POST /ai/chat/stream 支持 conversationId
没有 conversationId 时创建 AiConversation(type=CHAT)
有 conversationId 时追加 AiMessage
响应中返回 conversationId
```

底层使用 `AiConversation.type = CHAT` 与 Agent 会话区分。

### 智能体对话

保留：

| 接口地址 | 当前文件 | 目标模块 | 要求 |
| --- | --- | --- | --- |
| `POST /agent/chat` | `src/modules/knowledge-bot/chat/chat.controller.ts` | `src/modules/agent-chat` | `agentCode` 必传 |
| `POST /agent/chat/stream` | `src/modules/knowledge-bot/chat/chat.controller.ts` | `src/modules/agent-chat` | `agentCode` 必传 |

### 智能体会话

保留：

| 接口地址 | 当前文件 | 目标模块 | 要求 |
| --- | --- | --- | --- |
| `GET /agent/conversation/list` | `src/modules/knowledge-bot/conversation/conversation.controller.ts` | `src/modules/agent-chat` | 查询 Agent 会话 |
| `POST /agent/conversation/create` | `src/modules/knowledge-bot/conversation/conversation.controller.ts` | `src/modules/agent-chat` | 创建时 `agentCode` 必须可解析到启用 Agent |
| `GET /agent/conversation/detail` | `src/modules/knowledge-bot/conversation/conversation.controller.ts` | `src/modules/agent-chat` | 保留 |
| `POST /agent/conversation/rename` | `src/modules/knowledge-bot/conversation/conversation.controller.ts` | `src/modules/agent-chat` | 保留 |
| `POST /agent/conversation/delete` | `src/modules/knowledge-bot/conversation/conversation.controller.ts` | `src/modules/agent-chat` | 保留 |

### 管理接口

第一阶段保持 `/ai-platform/*`，内部目录改名后也先不改外部路径。管理接口均保留，不作为本次运行链路重构重点。

### 知识库业务接口

第一阶段保持 `/knowledge-bot/knowledge-base/*`，内部目录改名后也先不改外部路径。知识库业务接口均保留，不作为本次 Agent Runtime 重构重点。

## 文件夹确认清单

### 第一阶段建议新增

| 文件夹 | 目的 |
| --- | --- |
| `src/modules/ai-chat` | 普通 AI 对话模块 |
| `src/modules/ai-chat/dto` | 普通 AI 对话 DTO |
| `src/modules/agent-chat` | 智能体聊天入口模块 |
| `src/modules/agent-chat/chat` | 智能体对话 Controller、Service、DTO |
| `src/modules/agent-chat/chat/dto` | 智能体对话 DTO |
| `src/modules/agent-chat/conversation` | 智能体会话 Controller、Service、DTO |
| `src/modules/agent-chat/conversation/dto` | 智能体会话 DTO |
| `src/ai-engine/agent/context` | 第一阶段 AgentContext 构建 |
| `src/ai-engine/agent/router` | 第一阶段 AgentRouter |
| `src/ai-engine/agent/validator` | 第一阶段 AgentValidator |
| `src/ai-engine/agent/executor` | 第一阶段 AgentExecutor |
| `src/ai-engine/agent/composer` | 第一阶段 AgentComposer |
| `src/ai-engine/agent/trace` | 第一阶段 Trace |
| `src/ai-engine/rag` | 第一阶段运行时 RAG 能力目录，由 `knowledge-qa` 改名而来 |

### 第一阶段保留

| 文件夹 | 当前职责 | 建议 |
| --- | --- | --- |
| `src/ai-engine` | AI 能力层和 Agent 内核 | 第一阶段保留，第二阶段再改 `ai-runtime` |
| `src/ai-engine/vector` | 向量检索 | 保留 |
| `src/ai-engine/llm` | LLM 调用 | 保留 |
| `src/ai-engine/model` | 模型配置解析 | 保留 |
| `src/ai-engine/tool` | 工具执行，由 `src/ai-engine/tools` 改名而来 | 第一阶段统一为单数 `tool` |
| `src/ai-engine/workflow` | 工作流运行 | 保留 |
| `src/ai-engine/safety` | Safety / Guardrails | 保留 |
| `src/modules/ai-platform` | AI 配置管理 | 第一阶段保留，第三阶段再改 `ai-admin` |
| `src/modules/knowledge-bot/knowledge-base` | Knowledge Base 管理 | 第一阶段保留，第三阶段再改 `knowledge` |
| `src/modules/knowledge-bot/ai` | 工具注册 | 第一阶段保留 |

### 第一阶段迁出职责

| 文件夹 | 当前职责 | 建议 |
| --- | --- | --- |
| `src/modules/knowledge-bot/chat` | 当前承载 `/agent/chat` | 迁移到 `src/modules/agent-chat/chat` |
| `src/modules/knowledge-bot/conversation` | 当前承载 `/agent/conversation` | 迁移到 `src/modules/agent-chat/conversation` |
| `src/ai-engine/knowledge-qa` | 当前承载运行时 RAG 能力 | 第一阶段改名为 `src/ai-engine/rag` |
| `src/ai-engine/tools` | 当前承载工具执行能力 | 第一阶段改名为 `src/ai-engine/tool` |

## 关键文件确认清单

### 根模块

| 文件 | 建议 |
| --- | --- |
| `src/app.module.ts` | 注册新增 `AiChatModule`、`AgentChatModule` |
| `src/main.ts` | 不改 |

### 新增普通 AI 对话文件

| 文件 | 目的 |
| --- | --- |
| `src/modules/ai-chat/ai-chat.module.ts` | 普通 AI 对话模块 |
| `src/modules/ai-chat/ai-chat.controller.ts` | `/ai/chat` 和 `/ai/chat/stream` |
| `src/modules/ai-chat/ai-chat.service.ts` | 普通 LLM 对话编排，不读取 `AiAgent` |
| `src/modules/ai-chat/dto/ai-chat.dto.ts` | 普通 AI 对话请求 DTO |

### 新增或迁移智能体入口文件

| 文件 | 目的 |
| --- | --- |
| `src/modules/agent-chat/agent-chat.module.ts` | 智能体聊天入口模块 |
| `src/modules/agent-chat/chat/agent-chat.controller.ts` | `/agent/chat` 和 `/agent/chat/stream` |
| `src/modules/agent-chat/chat/agent-chat.service.ts` | 智能体对话外层编排 |
| `src/modules/agent-chat/chat/dto/agent-chat.dto.ts` | 智能体对话 DTO，`agentCode` 必传 |
| `src/modules/agent-chat/conversation/agent-conversation.controller.ts` | `/agent/conversation/*` |
| `src/modules/agent-chat/conversation/agent-conversation.service.ts` | 智能体会话服务 |
| `src/modules/agent-chat/conversation/dto/agent-conversation.dto.ts` | 智能体会话 DTO |

### 当前 knowledge-bot 运行时文件

| 当前文件 | 建议 |
| --- | --- |
| `src/modules/knowledge-bot/chat/chat.controller.ts` | 迁移后删除原文件，不保留兼容层 |
| `src/modules/knowledge-bot/chat/chat.service.ts` | 迁移后删除原文件，不保留兼容层 |
| `src/modules/knowledge-bot/chat/dto/chat.dto.ts` | 拆成普通 AI DTO 和智能体 DTO |
| `src/modules/knowledge-bot/conversation/conversation.controller.ts` | 迁移后删除原文件，不保留兼容层 |
| `src/modules/knowledge-bot/conversation/conversation.service.ts` | 迁移到 `agent-chat/conversation` 或抽共享持久化服务 |
| `src/modules/knowledge-bot/conversation/dto/conversation.dto.ts` | 迁移为智能体会话 DTO |
| `src/modules/knowledge-bot/knowledge-bot.module.ts` | 移除 ChatController 和 ConversationController 注册，只保留知识库管理和工具注册 |

### Agent 内核文件

| 文件 | 当前职责 | 建议 |
| --- | --- | --- |
| `src/ai-engine/agent/agent-runtime.service.ts` | 加载 Agent 配置、生成 context、调用 plan/executor/composer | 重构为纯智能体运行时 |
| `src/ai-engine/agent/agent-plan.service.ts` | 固定配置优先级路由和校验 | 拆为 Router + Validator，不再作为 Planner |
| `src/ai-engine/agent/agent-executor.service.ts` | 执行 workflow/tool/chat/rag | 迁入 `agent/executor` 或保持文件名后调整职责 |
| `src/ai-engine/agent/agent-response-composer.service.ts` | 整理最终回答 | 迁入 `agent/composer` 或保持文件名后调整职责 |
| `src/ai-engine/agent/agent-execution-logger.service.ts` | Agent 执行日志 | 概念改为 Trace，补 requestId/route/capability/duration/error |
| `src/ai-engine/agent/agent-runtime.types.ts` | Agent 类型 | 重构类型，加入 route、capability、context 明确结构 |

### 建议新增 Agent 内核文件

| 文件 | 目的 |
| --- | --- |
| `src/ai-engine/agent/context/agent-context.builder.ts` | 从 Agent 配置、用户、会话、历史构建可信 `AgentContext` |
| `src/ai-engine/agent/context/agent-context.types.ts` | `AgentContext` 类型 |
| `src/ai-engine/agent/router/agent-router.service.ts` | 第一阶段配置驱动能力路由 |
| `src/ai-engine/agent/router/agent-router.types.ts` | Router 输入输出类型 |
| `src/ai-engine/agent/validator/agent-validator.service.ts` | 根据 `AgentContext` 校验 route 权限和参数 |
| `src/ai-engine/agent/trace/agent-trace.service.ts` | Trace 记录，复用 `AiAgentExecutionLog` 持久化 |

### 能力层保留文件

| 文件 | 建议 |
| --- | --- |
| `src/ai-engine/ai-engine.module.ts` | 注册新增 Agent context、router、validator、trace 等 provider |
| `src/ai-engine/llm/llm.service.ts` | 保留，不做 Agent 路由决策 |
| `src/ai-engine/model/model-resolver.service.ts` | 保留 |
| `src/ai-engine/orchestrator/ai-orchestrator.service.ts` | 保留普通 completion/RAG completion 能力，但不作为 Agent 意图入口 |
| `src/ai-engine/safety/sensitive-word-checker.service.ts` | 保留，作为 Safety / Guardrails 当前实现 |
| `src/ai-engine/tool/tool.executor.ts` | 由 `tools/tool.executor.ts` 改名，作为 Tool 执行入口 |
| `src/ai-engine/tool/tool.types.ts` | 由 `tools/tool.types.ts` 改名，承载 Tool 类型 |
| `src/ai-engine/core/ai.registry.ts` | 保留 |
| `src/ai-engine/rag/rag.service.ts` | 由 `knowledge-qa.service.ts` 改名，作为运行时 RAG 能力 |
| `src/ai-engine/rag/rag-evidence.service.ts` | 由 `knowledge-evidence.service.ts` 改名，负责 RAG evidence |
| `src/ai-engine/rag/rag-answer-guard.service.ts` | 由 `knowledge-answer-guard.service.ts` 改名，RAG 输出必须经过 Guard |
| `src/ai-engine/rag/rag.types.ts` | 由 `knowledge.types.ts` 改名，承载 RAG 类型 |
| `src/ai-engine/knowledge-answer.util.ts` | 保留 |
| `src/ai-engine/vector/vector-store.service.ts` | 保留 |
| `src/ai-engine/embedding/embedding.service.ts` | 保留 |
| `src/ai-engine/infra/text-chunker.ts` | 保留 |
| `src/ai-engine/workflow/workflow-runtime.service.ts` | 保留 |
| `src/ai-engine/workflow/workflow-executor.service.ts` | 保留 |
| `src/ai-engine/workflow/workflow-validator.service.ts` | 保留 |
| `src/ai-engine/workflow/workflow-run-logger.service.ts` | 保留 |
| `src/ai-engine/workflow/workflow.types.ts` | 保留 |

## 数据库模型确认

本次方向上建议区分普通 AI 会话和 Agent 会话，但保持数据库变更最小。

| 模型 | 建议 |
| --- | --- |
| `AiConversation` | 新增或确认 `type: CHAT | AGENT`；新增或确认 `agentId nullable` |
| `AiMessage` | 保留，可通过 `metadata` 记录模型、route、sources 等非主关联信息 |
| `AiAgent` | 保留，Agent 会话主关联建议使用 `AiAgent.id` |
| `AiAgentExecutionLog` | 保留，作为 Trace 持久化实现，补 requestId/route/capability/toolCode/workflowCode/knowledgeBaseIds/duration/error |
| `AiPrompt` | 保留 |
| `AiModelProvider` | 保留 |
| `AiModelConfig` | 保留 |
| `AiSensitiveWord` | 保留 |
| `AiKnowledgeBase` | 保留 |
| `AiKnowledgeBaseAgent` | 保留 |
| `AiKnowledgeFile` | 保留 |
| `Document` | 保留 |
| `AiWorkflow` | 保留 |
| `AiWorkflowNode` | 保留 |
| `AiWorkflowEdge` | 保留 |
| `AiWorkflowRun` | 保留 |
| `AiWorkflowRunStep` | 保留 |
| `AiSkillPackage` | 保留，不作为 Agent v1 运行时直接依赖 |

不新增：

```text
AiEvaluation
AiTrace
AiMemory
```

如果执行数据库变更，必须完整闭环：

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
modules/ai-chat -> AgentRuntimeService
modules/ai-admin -> AgentRouter
modules/knowledge -> AgentRouter
ai-runtime -> modules/* Controller
```

允许：

```text
modules/agent-chat/service -> ai-runtime/agent/AgentRuntimeService
modules/ai-chat/service -> ai-runtime/llm/LlmService
ai-runtime/agent -> ai-runtime/rag
ai-runtime/agent -> ai-runtime/tool
ai-runtime/agent -> ai-runtime/workflow
ai-runtime/agent -> ai-runtime/llm
```

## 测试文件确认

### 建议新增测试

| 文件 | 用途 |
| --- | --- |
| `test/ai-chat-runtime-route-split-contract.test.cjs` | 验证 `/ai/chat` 不进入 AgentRuntime，`/agent/chat` 必须 agentCode |
| `test/ai-agent-router-route-contract.test.cjs` | 验证 `chat`、`rag`、`tool`、`workflow` route 选择 |
| `test/ai-agent-validator-contract.test.cjs` | 验证越权工具、未绑定工作流、未绑定 RAG 范围不能执行 |
| `test/ai-agent-platform-architecture-contract.test.cjs` | 验证禁止依赖和关键目录边界 |

### 需要更新的现有测试

| 文件 | 建议 |
| --- | --- |
| `test/ai-agent-runtime-routes-contract.test.cjs` | 更新为新路由分线和 agentCode 必传合同 |
| `test/ai-agent-runtime-clean-contract.test.cjs` | 更新 Agent Runtime 文件边界 |
| `test/ai-chat-stream-error-contract.test.cjs` | 区分普通 AI SSE 和 Agent SSE 错误合同 |
| `test/ai-chat-history-cleanup-contract.test.cjs` | 区分普通 AI 会话和智能体会话行为 |
| `test/ai-agent-knowledge-scope-contract.test.cjs` | 改为验证 Router 选择 RAG 后的范围校验 |
| `test/ai-agent-knowledge-base-binding-contract.test.cjs` | 保留，术语上归入 RAG 范围 |
| `test/ai-agent-workflow-dependency-contract.test.cjs` | 保留，补 Router 选择 workflow 后的绑定校验 |
| `test/ai-workflow-tool-contract.test.cjs` | 保留 |
| `test/ai-rag-answer-sanitize-contract.test.cjs` | 保留 |
| `test/ai-rag-fact-evidence-contract.test.cjs` | 保留 |
| `test/ai-workflow-knowledge-answer-contract.test.cjs` | 保留，后续可改名为 workflow-rag |

## 四阶段实施大纲

本文只确认总体方向；每个阶段必须以独立计划文档和验收计划执行。

### 阶段 1：目录骨架准备

计划文档：

```text
doc/code/AIEngine/agent-runtime-rebuild-phase-1-scaffold-plan.md
```

阶段职责：

```text
新建每个模块需要的文件夹。
原来的文件暂时全部保留。
不迁移代码。
不注册新模块。
不修改数据库。
不删除旧代码。
```

验收重点：

```text
新目录存在。
旧目录仍存在。
运行行为不变化。
没有新增 migration。
```

### 阶段 2：基础配置和知识库管理迁移

计划文档：

```text
doc/code/AIEngine/agent-runtime-rebuild-phase-2-base-config-migration-plan.md
```

阶段职责：

```text
迁移模型管理。
迁移知识库管理。
迁移提示词管理。
迁移敏感词管理。
基础增删改查迁移完成并验证通过后，同步删除原来的代码。
```

验收重点：

```text
/ai-platform/model-provider/* 路径保持可用。
/ai-platform/model/* 路径保持可用。
/ai-platform/prompt/* 路径保持可用。
/ai-platform/sensitive-word/* 路径保持可用。
/knowledge-bot/knowledge-base/* 路径保持可用。
对应旧目录引用清零后删除。
```

### 阶段 3：智能体配置和智能体运行链路迁移

计划文档：

```text
doc/code/AIEngine/agent-runtime-rebuild-phase-3-agent-runtime-migration-plan.md
```

阶段职责：

```text
迁移智能体新增修改相关代码。
迁移智能体配置读取和校验。
迁移 /agent/chat 对话流程。
迁移 /agent/chat/stream 流式流程。
迁移 /agent/conversation/* 会话流程。
拆分 AgentContext、AgentRouter、AgentValidator、AgentExecutor、AgentComposer、Trace。
迁移完成并验证通过后，同步删除原来的代码。
```

验收重点：

```text
智能体新增、修改、启停、详情、配置选项可用。
智能体非流式对话可用。
智能体流式对话可用。
智能体会话列表、创建、详情、重命名、删除可用。
输出敏感词检查发生在 assistant message 保存前。
若涉及 Prisma schema，必须完成数据库闭环。
```

### 阶段 4：预留

计划文档：

```text
doc/code/AIEngine/agent-runtime-rebuild-phase-4-reserved-plan.md
```

阶段职责：

```text
暂时留空。
不定义实施内容。
不授权源码修改。
```

验收重点：

```text
当前无实施验收。
后续补充范围后，必须重新形成计划和验收计划。
```

## 仍需确认的问题

1. 阶段 3 是否强制 `/agent/chat` 和 `/agent/chat/stream` 必传 `agentCode`。
2. 阶段 3 是否修改数据库，新增或确认 `AiConversation.type` 和 `AiConversation.agentId`。
3. 阶段 3 是否同步补齐 `AiAgentExecutionLog` 的 Trace 字段。
4. 阶段 4 后续是否用于纯目录迁移 `src/ai-engine -> src/ai-runtime`。
5. 阶段 4 后续是否用于外部接口路径迁移，例如 `/ai-platform/* -> /ai-admin/*`、`/knowledge-bot/knowledge-base/* -> /knowledge/*`。
