# 新版智能体流式 AI 对话计划

## 文档状态

本文档当前只记录大纲和待确认方向，不代表已经授权编码、移动旧代码、修改数据库或切换线上接口。

后续每次确认新的设计点后，再逐步补充到对应章节。

## 背景

当前后端已经具备智能体运行时骨架、流式输出、RAG、工具执行、工作流执行、敏感词检查和会话落库等能力。

但现有流式对话链路仍存在以下问题：

```text
/agent/chat/stream 仍由 knowledge-bot 历史目录承载。
agentCode 仍可选，接口同时兼容默认普通对话。
AgentPlanService 按固定优先级路由，不根据用户问题做能力选择。
workflowCode 存在时会固定优先执行 workflow。
knowledgeEnabled 与 mode 组合决定 knowledge 路径，缺少真正的 Planner / Router 判断。
route 名称仍使用 knowledge，容易和知识库管理模块混淆。
ChatService、AgentRuntimeService、AgentPlanService 的职责边界还不够清晰。
Planner 输出 route，仍然偏旧 Router 思维，不利于后续多能力、多步骤编排。
Executor 如果直接承载 LLM / RAG / Tool / Workflow，后续容易膨胀成超大类。
Composer 面向 SSE，会限制后续 HTTP、WebSocket、OpenAI Compatible API 等入口复用。
```

本次目标是在新文件夹中重新设计一套完整的流式 AI 对话链路，复用现有可用能力，替换旧链路中的固定、写死和不可扩展流程。

## 总体目标

新版流式 AI 对话应满足：

```text
有独立的新模块和新入口。
以 agentCode 选择智能体运行上下文。
根据用户问题、历史消息和智能体配置选择能力。
能力选择必须受智能体授权范围约束。
Planner 输出 ExecutionPlan，而不是 route。
Runtime 入口使用统一 AgentRuntimeRequest，而不是零散参数。
运行时统一使用 Capability / ExecutionStep / AgentEvent 模型。
使用 CapabilityResolver 输出真正可用的 AvailableCapabilities。
使用 CapabilityRegistry 注册能力 Handler，Executor 不写固定 switch 分支。
可复用现有 LLM / RAG / Tool / Workflow / Safety / Conversation 能力。
Composer 输出协议无关的 AgentEvent，SSE 只作为 Adapter。
不把不可用能力硬塞进第一版。
不可确认或不可用的能力先标记为待确认。
```

## 非目标

第一版暂不承诺：

```text
不直接改造旧 /agent/chat/stream，除非后续明确确认接管。
不直接删除旧 knowledge-bot/chat 代码。
不直接修改 Prisma schema，除非后续确认数据库闭环。
不实现自主循环 Agent。
不实现长期 Memory。
不实现 Evaluation。
不新增 AiTrace / AiMemory / AiEvaluation 表。
不在 Chat Controller 中写具体 RAG、Tool、Workflow 分支。
不让 Planner 直接决定 RAG 检索策略、阈值、TopK 或具体知识库实现细节。
不让 Planner 直接决定 knowledgeBaseIds；Planner 只表达需要知识查询。
不让 CapabilityExecutor 直接堆所有能力执行细节。
不让 Runtime 直接绑定 SSE 协议。
```

## 建议新目录

暂定目录：

```text
src/modules/agent-chat/
  agent-chat.module.ts

  stream/
    agent-stream.controller.ts
    agent-stream.service.ts
    dto/
      agent-stream.dto.ts

  chat/
    agent-chat.service.ts

  conversation/
    agent-conversation.service.ts
    dto/
      agent-conversation.dto.ts

  persistence/
    conversation.repository.ts

src/ai-engine/agent-v2/
  agent-v2-runtime.service.ts
  agent-v2-runtime.types.ts

  context/
    agent-context.builder.ts
    agent-context.types.ts

  capability/
    capability-resolver.service.ts
    capability-registry.service.ts
    capability.types.ts

  planner/
    agent-planner.service.ts
    agent-planner.types.ts
    rule-planner.service.ts

  validator/
    agent-plan-validator.service.ts

  executor/
    agent-capability-executor.service.ts
    handlers/
      chat.handler.ts
      rag.handler.ts
      tool.handler.ts
      workflow.handler.ts

  composer/
    agent-composer.service.ts
    agent-event.types.ts

  adapter/
    sse-event.adapter.ts

  trace/
    agent-trace.service.ts
```

目录名称后续可调整。当前只用于表达职责边界。

## 新版流式链路草案

```text
POST 新版流式对话入口
-> Controller 只负责参数接收和 SSE 输出
-> AgentStreamService 只负责 SSE 生命周期和错误事件转换
-> AgentChatService 做输入安全检查、会话处理、历史读取和消息落库
-> AgentV2RuntimeService 接收 AgentRuntimeRequest
-> AgentContextBuilder 读取智能体配置并构建上下文
-> CapabilityResolver 解析当前请求真正可用的能力
-> AgentPlanner 根据用户问题、历史和可用能力生成 ExecutionPlan
-> AgentPlanValidator 校验 ExecutionPlan 是否越权
-> AgentCapabilityExecutor 通过 CapabilityRegistry 调度对应 Handler
-> Chat / RAG / Tool / Workflow Handler 执行具体能力
-> AgentComposer 生成协议无关的 AgentEvent
-> AgentChatService 汇总最终答案
-> AgentChatService 做输出安全检查并保存安全后的 assistant message
-> AgentStreamService 通过 SSE Adapter 输出事件并返回 done
```

## 核心组件大纲

### AgentStreamController

职责：

```text
暴露新版流式 HTTP 接口。
设置 SSE 响应头。
把 Service 产生的事件写入响应。
把异常转换为统一 SSE error 事件。
```

禁止：

```text
不判断用户意图。
不直接调用 RAG / Tool / Workflow / LLM。
不拼接 Prompt。
不做智能体配置读取。
```

### AgentStreamService

职责：

```text
管理 SSE 生命周期。
调用 AgentChatService 获取 AgentEvent 流。
把 AgentEvent 交给 SSE Adapter 转成 SSE data。
把异常转换为统一 error 事件。
负责 done 事件和连接结束。
```

禁止：

```text
不处理聊天业务。
不读取 Agent 配置。
不保存消息。
不直接调用 AgentRuntime。
```

### AgentChatService

职责：

```text
处理输入敏感词。
校验 agentCode。
获取或创建智能体会话。
读取历史消息。
保存 user message。
组装 AgentRuntimeRequest。
调用 AgentV2RuntimeService。
汇总 assistant answer。
处理输出敏感词。
保存 assistant message。
刷新会话更新时间。
```

### AgentRuntimeRequest

Runtime 入口统一接收 `AgentRuntimeRequest`，避免 HTTP、WebSocket、OpenAI Compatible API 或内部 Workflow 调用各自拼接不同参数。

`AgentRuntimeRequest` 只携带一次请求的显式输入，不携带 history。History 属于 Runtime 上下文，由 ContextBuilder 通过 conversationId 统一加载，避免不同入口各自拼接历史导致行为不一致。

草案结构：

```text
AgentRuntimeRequest
  message
    content
    attachments

  agent
    code

  user
    id
    roles
    permissions

  conversation
    id
    type

  stream
    enabled

  metadata
    requestId
    channel
    source
    createdAt
```

### AgentContextBuilder

职责：

```text
通过 agentCode 读取启用的 AiAgent。
读取 prompt、model、knowledge、tool、workflow 等配置。
组合用户、会话、历史和运行元数据。
生成 Planner / Validator / Executor 都可信任的 AgentContext。
```

`AgentContext` 第一版就固定稳定外壳：

```text
AgentContext
  agent
  user
  conversation
  history
  request
  prompt
  model
  capabilities
  execution
  metadata
  memory?
```

`memory` 只预留字段，不在第一版实现。

`execution` 用于承载本次运行控制项，避免 `runtimeConfig` 语义发散：

职责：

```text
timeout
stream
temperature
maxTokens
maxSteps
retry
```

### CapabilityResolver

职责：

```text
基于 AgentContext 解析当前请求真正可用的能力。
输出 AvailableCapabilities。
屏蔽未配置、未启用、未授权或当前入口不允许的能力。
根据资源状态和运行环境标记能力 available / unavailable。
为 Planner 提供能力摘要，而不是底层执行细节。
```

它不仅做权限过滤，还要处理能力可用性：

```text
Agent 配置了 RAG，但没有绑定可用知识库或知识库没有可检索文档，则 RAG unavailable。
Agent 配置了 Tool，但工具依赖的 API Key 或服务不可用，则对应 Tool unavailable。
Agent 配置了 Workflow，但工作流未启用或校验失败，则 Workflow unavailable。
模型不支持某类能力时，对应 Capability unavailable。
```

设计原则：

```text
权限和可用性判断尽量前置，减少 Planner 产生非法计划的概率。
Planner 只能看到 AvailableCapabilities。
Validator 仍作为最后防线，但不把所有权限判断都后置。
```

### CapabilityRegistry

职责：

```text
注册 Capability 与 Handler 的映射关系。
为 CapabilityExecutor 提供 get(capability) 能力。
新增能力时只新增 Handler 并注册，不修改 Executor 主流程。
```

第一版注册：

```text
chat -> ChatHandler
rag -> RagHandler
tool -> ToolHandler
workflow -> WorkflowHandler
```

后续扩展：

```text
vision
memory
search
code
reason
```

### AgentPlanner

职责：

```text
根据用户问题、历史消息、AgentContext 和 AvailableCapabilities 生成 ExecutionPlan。
Planner 输出 steps，不输出 route。
每个 step 只能引用 AvailableCapabilities 中存在的 capability。
第一版可以只执行单步，但数据结构必须支持多步。
Planner 只表达要使用什么能力，不负责能力内部执行细节。
```

待确认：

```text
Planner 是否调用 LLM 做 intent classify。
Planner 第一版是否实际允许多步执行，还是只允许单步但保留 steps 结构。
Planner 输出是否需要结构化 JSON。
```

Planner 失败策略先固定为：

```text
LLM Planner 失败
-> Rule Planner
-> Chat fallback
-> 如果 chat 不在 AvailableCapabilities 中，则返回明确错误
```

ExecutionPlan 草案：

```json
{
  "metadata": {
    "version": 1
  },
  "strategy": {
    "mode": "sequential"
  },
  "steps": [
    {
      "id": "step_1",
      "capability": "rag",
      "reason": "用户问题需要查询企业知识",
      "input": {
        "query": "用户问题"
      }
    },
    {
      "id": "step_2",
      "capability": "chat",
      "reason": "基于检索结果生成最终回答",
      "input": {
        "usePreviousStepResult": true
      }
    }
  ]
}
```

`ExecutionPlan` 第一版可以只使用 `metadata.version`、`strategy.mode` 和 `steps`，但结构预留后续调度控制：

```text
planId
maxRetry
timeout
parallel
```

Planner 不应该直接决定：

```text
具体 knowledgeBaseIds。
RAG 的 threshold。
RAG 的 TopK。
RAG 的 embedding 模型。
RAG 是否 hybrid search。
具体工具实现。
具体工作流节点执行方式。
```

### AgentPlanValidator

职责：

```text
校验 Planner 输出的 ExecutionPlan / ExecutionStep / params。
禁止未授权工具。
禁止未绑定工作流。
禁止未授权知识库范围。
禁止 Planner 发明不存在的能力。
校验最大步骤数。
校验 step 输入参数完整性。
```

### AgentCapabilityExecutor

职责：

```text
按已校验计划执行能力。
只负责通过 CapabilityRegistry 获取 Handler 并执行。
控制步骤执行顺序和上一步输出传递。
向 Composer 返回统一执行结果或流式片段。
```

禁止：

```text
不在 CapabilityExecutor 中堆具体 RAG / Tool / Workflow / LLM 业务。
不在 CapabilityExecutor 中直接拼 Prompt。
不通过 switch / if 固定分发所有能力。
```

### Capability Handlers

第一版 Handler：

```text
ChatHandler
  负责普通 LLM 对话能力。

RagHandler
  负责 RAG 检索、证据整理、Prompt 组织、答案 Guard。

ToolHandler
  负责工具调用能力。

WorkflowHandler
  负责工作流执行能力。
```

Handler 复用现有底层能力，但输出统一的能力执行结果或 AgentEvent。

Handler 查底层资源和执行策略，不由 Planner 决定底层资源：

```text
RagHandler 根据 AgentContext.capabilities.rag 和 AvailableCapability 决定知识库范围、TopK、阈值和检索策略。
ToolHandler 根据 AvailableCapability 决定工具是否可执行和参数适配。
WorkflowHandler 根据 AvailableCapability 决定工作流是否可执行。
ChatHandler 根据 AgentContext.prompt / model / execution 决定 LLM 调用参数。
```

### AgentComposer

职责：

```text
生成协议无关的 AgentEvent。
统一 content、sources、tool、workflow、plan、error、done 等事件语义。
汇总最终 assistant answer。
保留必要 metadata 供消息落库和调试。
```

禁止：

```text
不直接依赖 Express Response。
不直接拼 SSE data。
不绑定 WebSocket 或 HTTP 传输协议。
```

### SSE Adapter

职责：

```text
把 AgentEvent 转换为 SSE data 输出格式。
处理 [DONE] 或 done 事件的传输格式。
隔离前端当前 SSE 消费协议。
```

### AgentTrace

职责：

```text
记录一次请求的 requestId、plan、capability、耗时和错误。
第一版优先复用 AiAgentExecutionLog。
是否扩展字段待确认。
```

## 能力复用清单

优先复用：

```text
ModelResolverService
LlmService
SensitiveWordCheckerService
VectorStoreService
KnowledgeQAService 中可复用的 RAG 逻辑
KnowledgeEvidenceService
KnowledgeAnswerGuardService
DefaultToolExecutor
WorkflowRuntimeService
AiAgent / AiPrompt / AiModelConfig / AiKnowledgeBaseAgent 等现有配置表
AiAgentExecutionLog
```

谨慎复用：

```text
旧 ConversationService 只参考持久化逻辑，不直接作为新版 Agent 对话业务服务依赖。
新版优先抽 AgentConversationService + ConversationRepository。
```

暂不确定是否复用：

```text
现有 AgentPlanService
现有 AgentRuntimeService
现有 AgentExecutorService
现有 AgentResponseComposerService
```

判断原则：

```text
能复用稳定底层能力就复用。
如果旧类职责混杂，只复用其底层依赖，不继续继承旧流程。
如果某能力当前不可用或边界不清，先列为待确认，不做假实现。
```

## Capability 和计划方向

新版运行时取消 route 概念，统一使用 Capability。

第一版 Capability 暂定：

```text
chat
rag
tool
workflow
```

不再使用：

```text
route 作为 Planner 输出。
knowledge 作为运行时 route 名称。
direct_chat 作为 route 名称。
```

Planner 输出 ExecutionPlan，不输出 route。

单步计划示例：

```json
{
  "steps": [
    {
      "id": "step_1",
      "capability": "rag",
      "reason": "用户问题需要查询企业知识",
      "input": {
        "query": "用户问题"
      }
    }
  ]
}
```

多步计划预留示例：

```json
{
  "steps": [
    {
      "id": "step_1",
      "capability": "rag",
      "input": {
        "query": "查询企业政策"
      }
    },
    {
      "id": "step_2",
      "capability": "tool",
      "input": {
        "toolCode": "query_weather"
      }
    },
    {
      "id": "step_3",
      "capability": "chat",
      "input": {
        "usePreviousStepResult": true
      }
    }
  ]
}
```

## AgentEvent 草案

Composer 统一输出 `AgentEvent`，SSE、WebSocket、HTTP 非流式等传输方式通过 Adapter 转换。

暂定事件类型：

```text
plan        Planner 选择结果
content     模型或工作流输出文本
sources     RAG 来源
tool_start  工具开始
tool_done   工具结束
workflow_*  工作流事件透传或归一化
error       错误
done        本轮结束
```

事件结构草案：

```json
{
  "type": "content",
  "payload": {
    "text": "回答片段"
  },
  "metadata": {
    "stepId": "step_1",
    "capability": "chat"
  }
}
```

SSE Adapter 再负责转换为：

```text
data: {"type":"content","payload":{"text":"回答片段"},"metadata":{"stepId":"step_1","capability":"chat"}}
```

统一 Envelope：

```text
type      事件类型
payload   事件主体，不同事件使用不同 payload 结构
metadata  requestId、stepId、capability、timestamp 等元信息
```

示例：

```json
{
  "type": "tool_done",
  "payload": {
    "tool": {
      "code": "query_order",
      "result": {}
    }
  },
  "metadata": {
    "stepId": "step_2",
    "capability": "tool"
  }
}
```

## 接口方案待确认

候选方案：

```text
方案 A：新增 POST /agent-chat/stream
方案 B：新增 POST /agent/chat/stream-v2
方案 C：直接接管 POST /agent/chat/stream
```

当前倾向：

```text
先新增 v2 接口，保留旧接口，验证通过后再切换。
```

## 数据库方向待确认

第一版优先不改数据库。

待确认项：

```text
是否新增 AiConversation.type = CHAT | AGENT。
是否新增 AiConversation.agentId。
是否扩展 AiAgentExecutionLog 字段。
是否需要记录 Planner 的结构化计划。
是否需要新增 ExecutionPlan 快照字段。
```

建议后续优先规划字段：

```text
AiConversation.agentId
AiAgentExecutionLog.planSnapshot
```

上述字段对智能体会话归属和执行追踪价值较高，但第一版是否实施仍需单独确认；一旦修改 Prisma schema，必须执行数据库闭环。

如果后续确认修改 Prisma schema，必须单独补数据库实施和验收章节。

## 验收大纲

静态合同：

```text
新版入口不依赖旧 knowledge-bot/chat。
Controller 不直接依赖 LLM / Vector / Tool / Workflow。
Planner 输出必须经过 Validator。
Executor 只能执行 Validator 通过的计划。
Planner 不输出 route。
运行时统一使用 Capability / ExecutionPlan / AgentEvent。
CapabilityExecutor 通过 Handler 执行具体能力。
CapabilityExecutor 通过 CapabilityRegistry 分发，不写固定 switch。
CapabilityResolver 输出 AvailableCapabilities。
Composer 不直接依赖 SSE。
AgentStreamService 不直接处理聊天业务落库。
AgentRuntimeRequest 不包含 history。
AgentEvent 使用 type / payload / metadata Envelope。
```

运行合同：

```text
缺少 agentCode 时返回明确错误。
启用普通聊天能力时可以流式返回 content。
启用 RAG 能力时可以返回 content 和 sources。
未授权工具不能执行。
未绑定工作流不能执行。
输出敏感词检查发生在 assistant message 保存前。
Planner 看不到不可用能力。
第一版即使只执行单步，也使用 steps 结构。
Planner 失败后按 LLM Planner -> Rule Planner -> Chat fallback/error 处理。
```

真实验证：

```text
后续确认测试环境、模型配置和知识库数据后补充。
```

## 待沟通问题

1. 新接口使用 `/agent-chat/stream`、`/agent/chat/stream-v2`，还是直接接管 `/agent/chat/stream`。
2. Planner 第一版是否调用 LLM 做意图识别，还是先用可配置规则加结构化接口。
3. Planner 第一版是否真实执行多步，还是只允许单步但保留 steps 结构。
4. 普通 chat 是否也必须依附 agentCode，还是允许无智能体普通 AI 对话。
5. RAG 第一版复用 KnowledgeQAService，还是抽出新的 RagCapability。
6. Tool 第一版是否只支持显式工具调用，还是允许 Planner 选择工具。
7. Workflow 第一版是否允许 Planner 选择，还是只允许显式触发。
8. 是否现在就改会话模型为 type / agentId。
9. 是否需要前端立即接入 v2 SSE 事件。
10. 是否需要保留旧接口一段时间做灰度。
11. 第一版最大 step 数设置为 1、3，还是配置化。
12. AgentEvent 是否要兼容当前前端已有的 content / sources / workflow_* 事件。
13. 第一版是否实现 CapabilityRegistry 动态注册，还是静态 provider 注册。
14. 第一版是否落库 AiConversation.agentId 和 AiAgentExecutionLog.planSnapshot。

## 后续补充记录

后续沟通结论按时间追加到这里，并同步更新上方对应章节。

### 2026-08-05：吸收 Capability-Driven Runtime 方向

本次沟通确认新版计划应从 route-driven 调整为 capability-driven：

```text
Planner 不输出 route，改为输出 ExecutionPlan。
ExecutionPlan 使用 steps 结构，第一版即使只执行单步也保留多步扩展模型。
Runtime 入口统一为 AgentRuntimeRequest。
ContextBuilder 后增加 CapabilityResolver，Planner 只接收 AvailableCapabilities。
CapabilityExecutor 只做调度，具体执行拆到 Chat / RAG / Tool / Workflow Handler。
Composer 输出协议无关 AgentEvent，SSE 通过 Adapter 转换。
AgentStreamService 只负责 SSE 生命周期，聊天业务放入 AgentChatService。
旧 ConversationService 不直接复用，改为参考其持久化逻辑并抽 AgentConversationService / ConversationRepository。
```

### 2026-08-05：升级 CapabilityResolver 和 Registry 方向

本次沟通确认继续强化平台化运行时边界：

```text
CapabilityFilter 升级为 CapabilityResolver，输出 AvailableCapabilities。
CapabilityResolver 不只做权限过滤，也根据资源状态、密钥、模型能力、知识库状态和工作流状态判断能力是否真正可用。
CapabilityExecutor 通过 CapabilityRegistry 获取 Handler，不写固定 switch / if 分发。
ExecutionPlan 固定 metadata / strategy / steps 结构，第一版只用最小字段。
AgentRuntimeRequest 不包含 history，history 由 ContextBuilder 通过 conversationId 和 Repository 统一加载。
AgentContext 中 runtimeConfig 改为 execution，承载 timeout、stream、temperature、maxTokens、maxSteps、retry 等执行控制项。
AgentEvent 使用 type / payload / metadata 统一 Envelope。
Planner 只表达需要使用的能力，例如需要知识查询，不直接决定 knowledgeBaseIds 或 RAG 底层检索策略。
Planner 失败策略固定为 LLM Planner -> Rule Planner -> Chat fallback；如果 chat 不可用，则返回明确错误。
数据库先规划 AiConversation.agentId 和 AiAgentExecutionLog.planSnapshot，但不在文档当前状态下授权改库。
```

### 2026-08-05：确认 v2 新入口和分步沟通门禁

本次沟通确认后续实现边界：

```text
新版流式入口固定使用 src/modules/agent-chat 暴露 POST /agent/chat/stream-v2。
旧 /agent/chat/stream 暂不接管，旧 knowledge-bot/chat 暂不删除。
如果旧逻辑确实需要复用，优先把必要逻辑重新整理到本次重构涉及的新目录中，不直接依赖旧 ChatService、旧 AgentRuntimeService、旧 AgentPlanService、旧 AgentExecutorService 或旧 Composer 主流程。
后续旧代码会整体删除，因此 v2 不能把旧主流程当作长期依赖。
当前只补充计划文档，不授权开发、不授权改库、不授权切换前端入口。
```

后续开发必须按步骤沟通。每一步开始前先说明“本步要做什么、会改哪些文件、验收标准是什么”，等待确认后再执行；每一步结束后先汇报验证结果，再进入下一步沟通。

#### 旧链路可吸收机制清单

v2 不直接依赖旧 `ChatService`、旧 `AgentRuntimeService`、旧 `AgentPlanService`、旧 `AgentExecutorService` 或旧 Composer 主流程；但旧链路中已经验证过的运行机制应吸收到 v2 的新目录和新职责边界内。

可吸收机制：

```text
SSE 事件语义：保留 content、sources、error、workflow_* 等已被前端消费的事件含义，由 v2 SSE Adapter 负责兼容。
流式增量输出：普通 chat 和后续 RAG 生成过程应支持逐段 content 输出，不能退化为只返回最终整段答案。
最终 sources 事件：RAG 来源继续作为独立 sources 事件输出，避免把来源混入每个 content chunk。
输入/输出敏感词闭环：输入检查发生在 user message 保存前，输出检查发生在 assistant message 保存前。
会话归属校验：读取、复用、写入会话时必须校验 userId 所属关系，避免跨用户会话污染。
历史消息清洗：加载 history 时过滤不适合作为模型上下文的 assistant 历史内容，避免异常角色标记再次进入模型。
消息元数据落库：继续保存 agentCode、promptId、workflowCode、sources 等排查所需元数据。
执行日志：第一版继续复用现有 AiAgentExecutionLog.planJson 记录新版 ExecutionPlan，不为追踪能力急于改库。
模型解析统一入口：继续通过 ModelResolverService 得到运行时模型配置，不在 Controller、Service 或 Handler 中散落默认模型和环境变量兜底。
RAG 证据和答案 Guard：吸收 KnowledgeQAService、KnowledgeEvidenceService、KnowledgeAnswerGuardService 中稳定的证据整理、strict fallback 和答案约束机制。
```

吸收原则：

```text
保留已验证的产品合同和安全闭环，不保留旧主流程依赖。
需要旧逻辑时，优先迁移为 v2 新目录下的明确职责，或抽到底层公共能力服务。
不得为了兼容旧代码，在 v2 Controller、StreamService、Planner、Executor 或 Handler 中增加分散兜底。
```

不可吸收项：

```text
不吸收旧 AgentPlanService 的固定优先级路由：workflow -> tool -> knowledge -> chat。
不吸收无 agentCode 时自动退回默认普通对话的兜底行为；v2 必须明确依附 Agent。
不吸收 route / knowledge / direct_chat 等旧路由命名作为 Planner 输出；v2 只使用 Capability 和 ExecutionPlan。
不吸收由 mode + knowledgeEnabled 组合决定 RAG 路径的旧判断方式；v2 必须先经过 CapabilityResolver 和 Planner。
不让 Planner 决定 knowledgeBaseIds、TopK、threshold、embedding 模型或具体检索策略。
不吸收旧 AgentExecutorService 把 LLM / RAG / Tool / Workflow 堆在一个类里的结构。
不吸收旧 Composer 面向 SSE 的协议绑定；v2 Composer 只输出协议无关 AgentEvent。
不吸收在 Controller、StreamService 或业务方法里补默认模型、默认工具、默认知识库的分散兜底。
不为了兼容旧接口继续保留 knowledge-bot 命名作为新版智能体运行时模块名。
```

#### 分步实施计划

##### 第 1 步：确认 v2 文件边界和接口合同

执行内容：

```text
确认新增模块 src/modules/agent-chat 的目录结构。
确认 POST /agent/chat/stream-v2 的请求 DTO、响应 SSE 事件格式和错误格式。
确认 agentCode 在 v2 中为必填；缺少 agentCode 返回明确错误。
确认 v2 暂不改旧 /agent/chat/stream，不影响现有前端调用。
确认 v2 SSE 语义兼容 content、sources、error、workflow_*，由 SseEventAdapter 做协议转换。
确认 v2 支持流式增量 content 输出，不能把接口设计成只返回最终整段答案。
确认 RAG 来源继续作为独立 sources 事件输出，不混入每个 content chunk。
```

预计涉及文件：

```text
src/modules/agent-chat/agent-chat.module.ts
src/modules/agent-chat/stream/agent-stream.controller.ts
src/modules/agent-chat/stream/agent-stream.service.ts
src/modules/agent-chat/stream/dto/agent-stream.dto.ts
src/ai-engine/agent-v2/adapter/sse-event.adapter.ts
src/ai-engine/agent-v2/composer/agent-event.types.ts
src/app.module.ts
```

沟通门禁：

```text
开发前确认接口路径、agentCode 必填、SSE 事件 envelope 是否兼容当前前端。
开发前确认 content、sources、error、workflow_* 的 v2 事件语义。
开发前确认缺少 agentCode 时的错误事件格式。
未经确认不创建文件、不修改 AppModule。
```

验收标准：

```text
静态合同能证明新入口存在于 agent-chat 模块。
Controller 不直接依赖 LLM / RAG / Tool / Workflow。
SSE Adapter 只负责 AgentEvent 到 SSE data 的转换。
缺少 agentCode 的行为有明确测试或合同校验。
AgentEvent envelope 能表达 content、sources、error、workflow_*。
接口合同保留逐段 content 输出能力。
sources 能作为独立事件输出。
```

##### 第 2 步：确认 AgentRuntimeRequest 和 ContextBuilder

执行内容：

```text
定义 AgentRuntimeRequest、AgentContext、AgentExecution 控制字段。
实现 AgentContextBuilder，通过 agentCode 读取启用的 AiAgent、prompt、model、knowledge、tool、workflow 配置。
history 不从 AgentRuntimeRequest 传入，由 ContextBuilder 通过 conversationId 和新 Repository 统一读取。
留痕：history loader 必须继承旧链路的历史消息清洗机制，具体清洗规则到本步开发前再确认。
留痕：模型配置解析入口仍为 ModelResolverService；本步只确定上下文承载方式，具体 LLM 调用参数由 Handler 阶段确认。
```

预计涉及文件：

```text
src/ai-engine/agent-v2/agent-v2-runtime.types.ts
src/ai-engine/agent-v2/context/agent-context.types.ts
src/ai-engine/agent-v2/context/agent-context.builder.ts
src/modules/agent-chat/persistence/conversation.repository.ts
```

沟通门禁：

```text
开发前确认 AgentRuntimeRequest 字段。
开发前确认 history 由 ContextBuilder 加载，不由入口拼接。
开发前确认 history 清洗规则放在 ContextBuilder 还是 Repository。
开发前确认 ModelResolverService 的解析结果如何进入 AgentContext.model。
开发前确认旧 ConversationService 只参考逻辑，不作为 v2 直接依赖。
```

验收标准：

```text
AgentRuntimeRequest 不包含 history。
ContextBuilder 是 agentCode 到运行时配置的唯一解析入口。
模型解析仍走 ModelResolverService，不在业务入口补默认模型。
会话历史读取只通过 v2 Repository。
history loader 有明确清洗规则留痕，避免异常 assistant 历史重新进入模型。
```

##### 第 3 步：确认 CapabilityResolver 可用能力模型

执行内容：

```text
定义 Capability、AvailableCapability、AvailableCapabilities 类型。
实现 CapabilityResolver，统一判断 chat、rag、tool、workflow 是否授权且真实可用。
Resolver 输出给 Planner 的能力摘要，不暴露底层检索阈值、TopK、knowledgeBaseIds 决策权。
```

预计涉及文件：

```text
src/ai-engine/agent-v2/capability/capability.types.ts
src/ai-engine/agent-v2/capability/capability-resolver.service.ts
```

沟通门禁：

```text
开发前确认第一版能力范围是否只包含 chat、rag、tool、workflow。
开发前确认 rag 可用性判断采用哪些真实条件。
开发前确认 tool 和 workflow 第一版只允许 Agent 已授权或已绑定的能力。
```

验收标准：

```text
Planner 看不到 unavailable 能力。
未绑定知识库、未授权工具、未绑定工作流不能进入可用能力集合。
每一个可用性分支都能对应 Agent 配置或真实资源状态，不添加假想兜底。
```

##### 第 4 步：确认 Planner 和 Validator 第一版策略

执行内容：

```text
定义 ExecutionPlan、ExecutionStep、PlanStrategy 类型。
实现 RulePlanner 第一版；保留 AgentPlanner 外壳，后续可插入 LLM Planner。
第一版最多执行 1 个 step，但 ExecutionPlan 固定使用 steps 结构。
实现 AgentPlanValidator，校验 step 数量、capability 是否存在、工具和 workflow 是否越权。
```

预计涉及文件：

```text
src/ai-engine/agent-v2/planner/agent-planner.types.ts
src/ai-engine/agent-v2/planner/agent-planner.service.ts
src/ai-engine/agent-v2/planner/rule-planner.service.ts
src/ai-engine/agent-v2/validator/agent-plan-validator.service.ts
```

沟通门禁：

```text
开发前确认第一版是否只使用 RulePlanner。
开发前确认 maxSteps 第一版是否固定为 1。
开发前确认 Planner 失败后是否按 RulePlanner -> Chat fallback/error 处理。
```

验收标准：

```text
Planner 输出 ExecutionPlan，不输出 route。
ExecutionPlan 至少包含 metadata.version、strategy.mode、steps。
Validator 是 Executor 前的强制步骤。
未授权 capability、toolCode、workflowCode 会被 Validator 拒绝。
```

##### 第 5 步：确认 CapabilityRegistry、Executor 和 Handler 拆分

执行内容：

```text
实现 CapabilityRegistry，注册 chat、rag、tool、workflow Handler。
实现 AgentCapabilityExecutor，只负责按已校验计划从 Registry 取 Handler 并执行。
把 Chat / RAG / Tool / Workflow 的具体执行放到各自 Handler。
旧逻辑如需复用，只复制必要逻辑或抽取到底层公共服务，不直接调用旧 Executor 主流程。
留痕：ChatHandler / RagHandler 使用 ModelResolverService 解析后的模型上下文，不在 Handler 内补默认模型或直接读取环境变量。
留痕：RagHandler 必须吸收 evidence、answer guard、strict fallback 机制，具体复用 KnowledgeQAService 还是迁移到 v2 开发前再确认。
```

预计涉及文件：

```text
src/ai-engine/agent-v2/capability/capability-registry.service.ts
src/ai-engine/agent-v2/executor/agent-capability-executor.service.ts
src/ai-engine/agent-v2/executor/handlers/chat.handler.ts
src/ai-engine/agent-v2/executor/handlers/rag.handler.ts
src/ai-engine/agent-v2/executor/handlers/tool.handler.ts
src/ai-engine/agent-v2/executor/handlers/workflow.handler.ts
```

沟通门禁：

```text
开发前确认第一版 Registry 使用 Nest provider 静态注册，不做运行时动态插件注册。
开发前确认 RAG Handler 是复用 KnowledgeQAService 的稳定逻辑，还是把必要逻辑搬到 v2 RagHandler。
开发前确认 RAG evidence、answer guard、strict fallback 的复用边界。
开发前确认 Handler 阶段只消费 ModelResolverService 解析结果，不新增分散模型兜底。
开发前确认 Workflow Handler 是否透传现有 workflow_* 事件。
```

验收标准：

```text
CapabilityExecutor 不写固定 switch / if 分发具体能力。
ChatHandler 不处理 RAG、Tool、Workflow。
RagHandler 不由 Planner 决定 knowledgeBaseIds、TopK、threshold。
RagHandler 保留证据整理、答案 Guard 和 strict fallback 合同。
Handler 不绕过 ModelResolverService 另行解析默认模型或环境变量。
ToolHandler 只能执行授权工具。
WorkflowHandler 只能执行绑定 workflow。
```

##### 第 6 步：确认 Composer、AgentEvent 和 SSE Adapter

执行内容：

```text
实现协议无关 AgentEvent envelope。
实现 AgentComposer 汇总 content、sources、tool、workflow、plan、error、done 事件。
实现 SSE Adapter，把 AgentEvent 转换为当前前端可消费的 SSE data。
```

预计涉及文件：

```text
src/ai-engine/agent-v2/composer/agent-composer.service.ts
src/ai-engine/agent-v2/composer/agent-event.types.ts
src/ai-engine/agent-v2/adapter/sse-event.adapter.ts
```

沟通门禁：

```text
开发前确认 AgentEvent 是否兼容当前 content / sources / workflow_* 事件。
开发前确认 done 事件格式。
开发前确认错误事件是否统一为 type=error。
```

验收标准：

```text
Composer 不依赖 Express Response。
SSE Adapter 不读取 Agent 配置、不处理聊天落库。
AgentEvent 使用 type / payload / metadata envelope。
流式 content 能被逐段输出，sources 在检索完成后输出。
```

##### 第 7 步：确认 AgentChatService 会话闭环和安全检查

执行内容：

```text
实现 v2 AgentChatService，处理输入敏感词、创建或获取会话、保存 user message、调用 AgentV2RuntimeService、汇总 assistant answer、输出敏感词检查、保存 assistant message、刷新会话时间。
实现 v2 ConversationRepository，封装会话和消息持久化。
第一版继续使用现有 AiConversation.agentCode、AiMessage.agentCode/promptId/workflowCode、AiAgentExecutionLog.planJson 字段。
留痕：输入/输出敏感词闭环、会话归属校验、历史消息清洗、消息元数据落库和执行日志 planJson 都归入本步最终确认。
```

预计涉及文件：

```text
src/modules/agent-chat/chat/agent-chat.service.ts
src/modules/agent-chat/conversation/agent-conversation.service.ts
src/modules/agent-chat/conversation/dto/agent-conversation.dto.ts
src/modules/agent-chat/persistence/conversation.repository.ts
src/ai-engine/agent-v2/trace/agent-trace.service.ts
```

沟通门禁：

```text
开发前确认第一版不改 Prisma schema。
开发前确认是否需要 v2 独立 conversation 查询接口，还是先只做 stream 写入闭环。
开发前确认输出敏感词替换后再保存 assistant message。
开发前确认会话归属校验规则。
开发前确认消息元数据落库字段：agentCode、promptId、workflowCode、sources。
开发前确认 ExecutionPlan 写入现有 AiAgentExecutionLog.planJson。
开发前确认第 2 步 history 清洗是否需要在 Repository 侧补充最终落点。
```

验收标准：

```text
输入敏感词检查发生在 user message 保存前。
输出敏感词检查发生在 assistant message 保存前。
assistant message 保存安全处理后的最终答案。
读取和写入 conversation 前校验 userId 归属。
assistant history 清洗规则在 v2 会话闭环中生效。
AiMessage 保存 agentCode、promptId、workflowCode、sources 等排查元数据。
执行计划写入现有 AiAgentExecutionLog.planJson。
最终回复区分源码已改、Prisma Client 未涉及、目标数据库未改。
```

##### 第 8 步：确认测试、构建和真实验证范围

执行内容：

```text
补充 focused 单元测试或合同测试，覆盖 v2 静态合同和关键运行合同。
运行后端测试、类型检查或构建命令。
如果需要验证真实模型、知识库或浏览器 SSE，再单独确认环境、账号、数据和启动方式。
```

预计涉及文件：

```text
src/**/*.spec.ts
或项目当前约定的合同测试文件
```

沟通门禁：

```text
开发前确认测试类型：单元测试、合同测试、接口测试或真实 SSE 验证。
真实模型、数据库、浏览器验证必须单独确认，不用静态测试冒充。
```

验收标准：

```text
测试覆盖缺少 agentCode、Planner 不输出 route、Resolver 屏蔽不可用能力、Validator 拒绝越权计划、Executor 通过 Registry 调度、SSE Adapter 输出 envelope。
npm.cmd run build 或约定检查命令通过；如果失败，明确失败原因。
真实验证如未执行，最终回复明确标注未验证。
```

##### 第 9 步：确认前端接入和旧接口处理

执行内容：

```text
在 v2 后端验证通过后，再单独确认是否修改 Vue2 前端调用 /agent/chat/stream-v2。
确认是否保留旧 /agent/chat/stream 灰度，或直接在后续阶段删除旧 knowledge-bot/chat。
旧接口删除必须作为单独步骤确认。
```

预计涉及文件：

```text
fullstack-admin-serve/vue-element-admin-dev/src/api/ai.js
fullstack-admin-serve/vue-element-admin-dev/src/views/AIEngine/chat/index.vue
nestjs-prisma/src/modules/knowledge-bot/chat/*
```

沟通门禁：

```text
后端 v2 未验证通过前，不接前端。
删除旧接口前必须单独确认。
涉及前端时必须重新确认 SSE 事件兼容和页面验收标准。
```

验收标准：

```text
前端请求明确发送 agentCode。
前端能消费 v2 content、sources、error、done 和 workflow 事件。
旧接口删除或保留状态在最终回复中明确说明。
```

#### 总体验收顺序

```text
先静态合同测试。
再后端构建或类型检查。
再接口级 SSE 验证。
最后才做真实模型、真实知识库、真实前端浏览器验证。
```

任何一步如果涉及 Prisma schema、migration、seed、字段关系或数据库运行字段变化，必须停止当前步骤，先补充数据库实施方案并单独沟通确认，确认后再按数据库修改闭环规则执行。
