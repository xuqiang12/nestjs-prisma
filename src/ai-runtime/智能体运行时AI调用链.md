# Agent Runtime AI 调用链调试导航

这份文档说明当前后端 AI 对话从 HTTP 入口到模型调用、能力分发、知识库问答和消息落库的真实链路。

显示约定：路径使用 Markdown 链接，方法使用代码样式；普通聊天和 Agent Runtime 是两条不同后端入口，不要混在一起排查。

## 后端入口总览

当前后端 AI 对话有两条入口：

1. 普通聊天：`POST /chat`
2. 智能体流式聊天：`POST /agent/chat/stream`

普通聊天只走默认模型直答，不进入 Agent Runtime，也不会自动查知识库。智能体流式聊天必须带 `agentCode`，会进入 Agent Runtime，再由 Planner 决定走 `chat / rag / tool / workflow`。

## 普通聊天后端流程

[src/modules/chat/chat.controller.ts](../modules/chat/chat.controller.ts) `ChatController.chat()`  
-> [src/modules/chat/chat.service.ts](../modules/chat/chat.service.ts) `ChatService.chat()`  
-> [src/modules/chat/persistence/chat-conversation.repository.ts](../modules/chat/persistence/chat-conversation.repository.ts) `ChatConversationRepository.getOrCreateConversation()`  
-> [src/modules/chat/persistence/chat-conversation.repository.ts](../modules/chat/persistence/chat-conversation.repository.ts) `ChatConversationRepository.getHistoryMessages()`  
-> [src/modules/chat/persistence/chat-conversation.repository.ts](../modules/chat/persistence/chat-conversation.repository.ts) `ChatConversationRepository.saveMessage()` 保存用户消息  
-> [src/ai-runtime/model/model-resolver.service.ts](model/model-resolver.service.ts) `ModelResolverService.resolveDefault()` 解析默认聊天模型  
-> [src/ai-runtime/llm/llm.service.ts](llm/llm.service.ts) `LlmService.invokeWithMessages()`  
-> OpenAI 兼容 `chat.completions.create()`  
-> [src/modules/chat/persistence/chat-conversation.repository.ts](../modules/chat/persistence/chat-conversation.repository.ts) `ChatConversationRepository.saveMessage()` 保存助手消息  
-> 返回 `{ conversationId, answer }`

这条链路只使用普通会话历史和默认模型配置，不读取 `AiAgent`，不执行 `CapabilityResolver`，不进入 `KnowledgeQAService`。

## 智能体流式入口

[src/modules/agent-chat/stream/agent-stream.controller.ts](../modules/agent-chat/stream/agent-stream.controller.ts) `AgentStreamController.stream()`  
-> 设置 `text/event-stream` 响应头  
-> [src/modules/agent-chat/stream/agent-stream.service.ts](../modules/agent-chat/stream/agent-stream.service.ts) `AgentStreamService.stream()`  
-> 校验 `agentCode` 和登录用户  
-> [src/modules/agent-chat/chat/agent-chat.service.ts](../modules/agent-chat/chat/agent-chat.service.ts) `AgentChatService.stream()`  
-> [src/ai-runtime/safety/sensitive-word-checker.service.ts](safety/sensitive-word-checker.service.ts) `SensitiveWordCheckerService.checkAndApply()` 输入敏感词检查  
-> [src/modules/agent-chat/persistence/conversation.repository.ts](../modules/agent-chat/persistence/conversation.repository.ts) `ConversationRepository.getOrCreateConversation()`  
-> [src/modules/agent-chat/persistence/conversation.repository.ts](../modules/agent-chat/persistence/conversation.repository.ts) `ConversationRepository.saveMessage()` 保存用户消息  
-> `AgentChatService.createRuntimeRequest()` 组装 `AgentRuntimeRequest`  
-> [src/ai-runtime/agent-runtime.service.ts](agent-runtime.service.ts) `AgentRuntimeService.stream()`

`AgentStreamService` 还会通过 [src/ai-runtime/trace/execution-trace-presenter.service.ts](trace/execution-trace-presenter.service.ts) `ExecutionTracePresenterService.consume()` 把内部执行事件转换成前端展示用的 `trace_update` 事件。

## Agent Runtime 主流程

[src/ai-runtime/agent-runtime.service.ts](agent-runtime.service.ts) `AgentRuntimeService.stream()`  
-> [src/ai-runtime/context/agent-context.builder.ts](context/agent-context.builder.ts) `AgentContextBuilder.build()`  
-> [src/ai-runtime/capability/capability-resolver.service.ts](capability/capability-resolver.service.ts) `CapabilityResolver.resolve()`  
-> [src/ai-runtime/planner/rule-planner.service.ts](planner/rule-planner.service.ts) `RulePlanner.plan()`  
-> [src/ai-runtime/validator/agent-plan-validator.service.ts](validator/agent-plan-validator.service.ts) `AgentPlanValidator.validate()`  
-> [src/ai-runtime/composer/agent-composer.service.ts](composer/agent-composer.service.ts) `AgentComposer.createPlanEvent()` 输出计划事件  
-> [src/ai-runtime/trace/agent-trace.service.ts](trace/agent-trace.service.ts) `AgentTraceService.start()` 记录运行轨迹  
-> [src/ai-runtime/executor/agent-capability-executor.service.ts](executor/agent-capability-executor.service.ts) `AgentCapabilityExecutor.execute()`  
-> 按 `step.capability` 分发到 `ChatHandler / RagHandler / ToolHandler / WorkflowHandler`

`AgentContextBuilder.build()` 会读取当前启用的 Agent、Prompt、模型配置、历史消息、知识库绑定、工具授权和工作流绑定：

[src/ai-runtime/context/agent-context.builder.ts](context/agent-context.builder.ts) `prisma.aiAgent.findFirst()`  
-> `prisma.aiPrompt.findFirst()`  
-> [src/ai-runtime/model/model-resolver.service.ts](model/model-resolver.service.ts) `ModelResolverService.resolve()`  
-> [src/modules/agent-chat/persistence/conversation.repository.ts](../modules/agent-chat/persistence/conversation.repository.ts) `ConversationRepository.getHistoryMessages()`  
-> 返回 `AgentContext`

## 第一次 AI：意图识别

[src/ai-runtime/planner/rule-planner.service.ts](planner/rule-planner.service.ts) `RulePlanner.classifyIntent()`  
-> [src/ai-runtime/planner/intent-classifier.service.ts](planner/intent-classifier.service.ts) `IntentClassifierService.classify()`  
-> [src/ai-runtime/llm/llm.service.ts](llm/llm.service.ts) `LlmService.invokeWithMessages()`  
-> OpenAI 兼容 `chat.completions.create()`

这次 AI 只负责返回结构化规划判断：`chat / rag / tool / workflow`、置信度、原因、原问题和改写问题。`RulePlanner.resolveCapability()` 只接受置信度不低于 `0.6` 且处于 Planner 可见能力列表里的结果，否则回退到 `chat` 或第一个可用能力。

## 能力可见条件

[src/ai-runtime/capability/capability-resolver.service.ts](capability/capability-resolver.service.ts) `CapabilityResolver.resolve()`

- `chat`：只要模型配置解析成功即可用。
- `rag`：必须同时满足 `knowledgeEnabled = true`、绑定了启用知识库。
- `tool`：必须授权了除 `search_knowledge` 之外的普通工具。
- `workflow`：必须绑定了 `workflowCode`。

[src/ai-runtime/validator/agent-plan-validator.service.ts](validator/agent-plan-validator.service.ts) `AgentPlanValidator.validate()` 会再次校验计划没有越权：工具只能调用当前 Agent 授权的普通工具，工作流只能调用当前 Agent 绑定的工作流。

## chat 普通能力路线

`step.capability = chat`  
-> [src/ai-runtime/executor/handlers/chat.handler.ts](executor/handlers/chat.handler.ts) `ChatHandler.execute()`  
-> 组装 `system prompt + history + user question`  
-> [src/ai-runtime/llm/llm.service.ts](llm/llm.service.ts) `LlmService.streamWithMessages()`  
-> OpenAI 兼容 `chat.completions.create({ stream: true })`  
-> 逐段产出 `content` 事件

这条路线是 Agent Runtime 里的普通对话能力，和 `POST /chat` 不是同一套入口。

## rag 知识库能力路线

`step.capability = rag`  
-> [src/ai-runtime/executor/handlers/rag.handler.ts](executor/handlers/rag.handler.ts) `RagHandler.execute()`  
-> [src/ai-runtime/knowledge/knowledge-qa.service.ts](knowledge/knowledge-qa.service.ts) `KnowledgeQAService.answer()`  
-> [src/ai-runtime/knowledge/knowledge-qa.service.ts](knowledge/knowledge-qa.service.ts) `KnowledgeQAService.buildCompletion()`  
-> [src/ai-runtime/vector/vector-store.service.ts](vector/vector-store.service.ts) `VectorStoreService.similaritySearch()`  
-> [src/ai-runtime/knowledge/knowledge-evidence.service.ts](knowledge/knowledge-evidence.service.ts) `KnowledgeEvidenceService.buildEvidence()`  
-> [src/ai-runtime/knowledge/knowledge-evidence.service.ts](knowledge/knowledge-evidence.service.ts) `KnowledgeEvidenceService.buildPromptEvidence()`  
-> [src/ai-runtime/llm/llm.service.ts](llm/llm.service.ts) `LlmService.invokeWithMessages()`  
-> [src/ai-runtime/knowledge/knowledge-answer-guard.service.ts](knowledge/knowledge-answer-guard.service.ts) `KnowledgeAnswerGuardService.ensureAnswer()`  
-> [src/ai-runtime/knowledge/knowledge-fact-structure.util.ts](knowledge/knowledge-fact-structure.util.ts) `buildAnswerFacts()`  
-> [src/ai-runtime/knowledge/fact-aligner.ts](knowledge/fact-aligner.ts) `FactAligner.align()`  
-> [src/ai-runtime/knowledge/fact-verifier.ts](knowledge/fact-verifier.ts) `FactVerifier.verify()`  
-> `KnowledgeQAService.evaluateGroundingDecision()`  
-> `RagHandler` 输出 `content`，如果有来源再输出 `sources`

严格知识库模式下，`KnowledgeQAService.buildCompletion()` 会使用 `distance <= 0.45`；非严格模式使用 `distance <= 0.55`。严格模式没有来源时直接返回 `未找到相关制度。`，不会继续调用模型生成知识库答案。

## tool 工具能力路线

`step.capability = tool`  
-> [src/ai-runtime/executor/handlers/tool.handler.ts](executor/handlers/tool.handler.ts) `ToolHandler.execute()`  
-> 输出 `tool_start`  
-> [src/ai-runtime/tools/default-tool.executor.ts](tools/default-tool.executor.ts) `DefaultToolExecutor.execute()`  
-> 输出 `tool_done`

这条路线本身不再调用 AI。

## workflow 工作流能力路线

`step.capability = workflow`  
-> [src/ai-runtime/executor/handlers/workflow.handler.ts](executor/handlers/workflow.handler.ts) `WorkflowHandler.execute()`  
-> [src/ai-runtime/workflow/workflow-runtime.service.ts](workflow/workflow-runtime.service.ts) `WorkflowRuntimeService.stream()`  
-> [src/ai-runtime/workflow/workflow-executor.service.ts](workflow/workflow-executor.service.ts) `WorkflowExecutorService.streamExecute()`  
-> 按工作流节点类型继续分支

LLM 节点：

[src/ai-runtime/workflow/workflow-executor.service.ts](workflow/workflow-executor.service.ts) `WorkflowExecutorService.streamLlmNode()`  
-> [src/ai-runtime/llm/llm.service.ts](llm/llm.service.ts) `LlmService.streamWithMessages()`  
-> OpenAI 兼容 `chat.completions.create({ stream: true })`

knowledge 节点：

[src/ai-runtime/workflow/workflow-executor.service.ts](workflow/workflow-executor.service.ts) `executeNode()` 中 `node.type === 'knowledge'`  
-> 按 Agent 绑定的知识库范围检索
-> [src/ai-runtime/vector/vector-store.service.ts](vector/vector-store.service.ts) `VectorStoreService.similaritySearch()`  
-> [src/ai-runtime/knowledge/knowledge-evidence.service.ts](knowledge/knowledge-evidence.service.ts) `KnowledgeEvidenceService.buildEvidence()`  
-> 把 `sources / knowledgeEvidence / knowledgeFacts` 写入工作流上下文

后续 LLM 节点如果已经有 `sources`，会走知识库回答约束：

[src/ai-runtime/workflow/workflow-executor.service.ts](workflow/workflow-executor.service.ts) `buildKnowledgeSystemPrompt()`  
-> [src/ai-runtime/knowledge/knowledge-evidence.service.ts](knowledge/knowledge-evidence.service.ts) `KnowledgeEvidenceService.buildPromptEvidence()`  
-> 模型生成答案  
-> [src/ai-runtime/workflow/workflow-executor.service.ts](workflow/workflow-executor.service.ts) `ensureKnowledgeAnswer()`  
-> [src/ai-runtime/knowledge/knowledge-answer-guard.service.ts](knowledge/knowledge-answer-guard.service.ts) `KnowledgeAnswerGuardService.ensureAnswer()`

tool 节点：

[src/ai-runtime/workflow/workflow-executor.service.ts](workflow/workflow-executor.service.ts) `executeNode()` 中 `node.type === 'tool'`  
-> [src/ai-runtime/tools/default-tool.executor.ts](tools/default-tool.executor.ts) `DefaultToolExecutor.execute()`

## Agent 输出落库

Agent Runtime 事件回到 [src/modules/agent-chat/chat/agent-chat.service.ts](../modules/agent-chat/chat/agent-chat.service.ts) `AgentChatService.stream()` 后：

`AgentComposer.collectAssistantResult(events)` 汇总答案、来源、promptId、workflowCode  
-> [src/ai-runtime/safety/sensitive-word-checker.service.ts](safety/sensitive-word-checker.service.ts) `SensitiveWordCheckerService.checkAndApply()` 输出敏感词检查  
-> [src/ai-runtime/trace/execution-trace-builder.service.ts](trace/execution-trace-builder.service.ts) `ExecutionTraceBuilderService.buildFinalTrace()` 生成最终展示轨迹  
-> [src/modules/agent-chat/persistence/conversation.repository.ts](../modules/agent-chat/persistence/conversation.repository.ts) `ConversationRepository.saveMessage()` 保存助手消息、`sources` 和 `executionTrace`  
-> [src/modules/agent-chat/persistence/conversation.repository.ts](../modules/agent-chat/persistence/conversation.repository.ts) `ConversationRepository.touchConversation()`

## knowledge 目录文件用途和调用位置

`src/ai-runtime/knowledge` 是 Agent Runtime 的知识库问答内核。它只属于新版运行时侧，不直接 import 旧 `src/ai-engine`。

| 文件 | 主要职责 | 在哪用 |
| --- | --- | --- |
| [knowledge-qa.service.ts](knowledge/knowledge-qa.service.ts) | RAG 问答总入口，负责检索、证据、模型回答、答案 Guard、事实对齐、事实验证和 grounding 决策。 | 被 [src/ai-runtime/executor/handlers/rag.handler.ts](executor/handlers/rag.handler.ts) 注入并调用；由 [src/ai-runtime/ai-runtime.module.ts](ai-runtime.module.ts) 注册。 |
| [knowledge-evidence.service.ts](knowledge/knowledge-evidence.service.ts) | 把向量召回结果整理成 `sources / items / facts`，并构建给模型看的证据文本。 | 被 `KnowledgeQAService` 调用；也被 [src/ai-runtime/workflow/workflow-executor.service.ts](workflow/workflow-executor.service.ts) 的 knowledge 节点和知识 LLM prompt 复用。 |
| [knowledge-answer-guard.service.ts](knowledge/knowledge-answer-guard.service.ts) | 校验答案里的数字事实是否来自知识库；不可信时生成事实兜底回答；清理角色模板和复制出来的知识片段。 | 被 `KnowledgeQAService` 调用；也被 `WorkflowExecutorService.ensureKnowledgeAnswer()` 复用。 |
| [knowledge-answer.util.ts](knowledge/knowledge-answer.util.ts) | 提供数字短语提取、数字事实校验和兜底文本构建。 | 被 `KnowledgeAnswerGuardService` 调用；`knowledge-fact-structure.util.ts` 也复用 `extractKnowledgeNumberTerms()`。 |
| [knowledge-fact-structure.util.ts](knowledge/knowledge-fact-structure.util.ts) | 提供事实文本压缩、拆分、结构化、回答事实提取和归一化规则。 | 被 `KnowledgeEvidenceService.buildFacts()` 用来构建知识事实；被 `KnowledgeQAService.answer()` 用 `buildAnswerFacts()` 提取回答事实；被 `FactAligner` 和 `FactVerifier` 用 `normalizeFactText()` 做确定性比较。 |
| [fact-aligner.ts](knowledge/fact-aligner.ts) | 把回答事实对齐到候选知识事实，只找候选，不判断真假。 | 被 `KnowledgeQAService.answer()` 内部实例化并调用。 |
| [fact-verifier.ts](knowledge/fact-verifier.ts) | 根据已对齐候选判断 `SUPPORTED / CONTRADICTED / NOT_FOUND / UNCERTAIN`。 | 被 `KnowledgeQAService.answer()` 内部实例化并调用。 |
| [knowledge.types.ts](knowledge/knowledge.types.ts) | 定义知识事实、证据、Guard、CompletionPlan、RuntimeContext、QAResult 等类型。 | 被 knowledge 目录、RAG handler、workflow executor 共同引用。 |

## knowledge 目录内部执行细节

RAG 能力完整知识链：

`RagHandler.execute()`  
-> `KnowledgeQAService.answer(context)`  
-> `KnowledgeQAService.buildCompletion(context)`  
-> `VectorStoreService.similaritySearch(rewrittenQuestion, 5, { tags, knowledgeBaseIds })`  
-> `filterSources()` 按严格/非严格阈值筛选  
-> `KnowledgeEvidenceService.buildEvidence(sources)`  
-> `KnowledgeEvidenceService.buildFacts(items)`  
-> `splitFactTexts(compactFactContent(source.content))`  
-> `buildStructuredFactParts(text)` 识别事实类型、主体、属性和值  
-> `KnowledgeEvidenceService.buildPromptEvidence(evidence.items)`  
-> `LlmService.invokeWithMessages(messages, llmOptions)`  
-> `KnowledgeAnswerGuardService.ensureAnswer(rawAnswer, knowledgeFacts, question)`  
-> `validateKnowledgeAnswer()` 检查答案数字是否来自 facts  
-> 如果不通过，`buildKnowledgeFallbackAnswer()` 使用知识事实兜底  
-> `buildAnswerFacts(rawAnswer)` 从原始模型答案提取回答事实  
-> `FactAligner.align(answerFacts, knowledgeFacts)` 找候选事实  
-> `FactVerifier.verify(factAlignment.items)` 判断支持状态  
-> `evaluateGroundingDecision()` 生成 `ALLOW / WARN / BLOCK`  
-> 返回 `KnowledgeQAResult`

工作流 knowledge 节点不会直接调用 `KnowledgeQAService.answer()`。它只复用检索、证据和 Guard：

`WorkflowExecutorService.executeNode(node.type === 'knowledge')`  
-> `VectorStoreService.similaritySearch()`  
-> `KnowledgeEvidenceService.buildEvidence()`  
-> 写入 `values.sources / values.knowledgeEvidence / values.knowledgeFacts`  
-> 后续 `llm` 节点用 `buildKnowledgeSystemPrompt()` 拼证据  
-> `LlmService.invokeWithMessages()` 或 `streamWithMessages()`  
-> `KnowledgeAnswerGuardService.ensureAnswer()`

## 最常用断点

[src/modules/chat/chat.service.ts](../modules/chat/chat.service.ts) `ChatService.chat()`：普通 `/chat` 是否进入默认模型直答。

[src/modules/agent-chat/stream/agent-stream.service.ts](../modules/agent-chat/stream/agent-stream.service.ts) `AgentStreamService.stream()`：Agent 流式入口是否收到 `agentCode` 和用户身份。

[src/modules/agent-chat/chat/agent-chat.service.ts](../modules/agent-chat/chat/agent-chat.service.ts) `AgentChatService.stream()`：用户消息保存、Runtime 请求和助手消息落库。

[src/ai-runtime/context/agent-context.builder.ts](context/agent-context.builder.ts) `AgentContextBuilder.build()`：Agent 配置、Prompt、模型、知识库、工具、工作流是否正确进入上下文。

[src/ai-runtime/planner/intent-classifier.service.ts](planner/intent-classifier.service.ts) `IntentClassifierService.classify()`：第一次 AI 意图识别发给模型的 messages 和返回 JSON。

[src/ai-runtime/planner/rule-planner.service.ts](planner/rule-planner.service.ts) `RulePlanner.resolveCapability()`：AI 判断是否被接受，还是回退到 `chat`。

[src/ai-runtime/executor/agent-capability-executor.service.ts](executor/agent-capability-executor.service.ts) `AgentCapabilityExecutor.execute()`：最终进入哪个能力 handler。

[src/ai-runtime/knowledge/knowledge-qa.service.ts](knowledge/knowledge-qa.service.ts) `KnowledgeQAService.buildCompletion()`：RAG 是否检索、阈值是否过滤、证据是否生成。

[src/ai-runtime/knowledge/knowledge-answer-guard.service.ts](knowledge/knowledge-answer-guard.service.ts) `KnowledgeAnswerGuardService.ensureAnswer()`：知识库答案是否因为数字不被事实支持而兜底。

[src/ai-runtime/llm/llm.service.ts](llm/llm.service.ts) `LlmService.invokeWithMessages()`：非流式模型请求。

[src/ai-runtime/llm/llm.service.ts](llm/llm.service.ts) `LlmService.streamWithMessages()`：流式模型请求。
