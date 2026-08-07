# Agent Runtime AI 调用链调试导航

这份文档放在 `src/ai-runtime` 下，用来调试新版智能体从入口、意图识别到各能力分支的 AI 调用链。

显示约定：路径使用 Markdown 链接，预览里通常是蓝色；方法使用代码样式，方便和路径区分。

## 接口入口

[src/modules/agent-chat/stream/agent-stream.controller.ts:36](../modules/agent-chat/stream/agent-stream.controller.ts#L36) `AgentStreamController.stream()`  
-> [src/modules/agent-chat/stream/agent-stream.controller.ts:41](../modules/agent-chat/stream/agent-stream.controller.ts#L41) `agentStreamService.stream()`  
-> [src/modules/agent-chat/stream/agent-stream.service.ts:13](../modules/agent-chat/stream/agent-stream.service.ts#L13) `AgentStreamService.stream()`  
-> [src/modules/agent-chat/stream/agent-stream.service.ts:46](../modules/agent-chat/stream/agent-stream.service.ts#L46) `agentChatService.stream()`  
-> [src/modules/agent-chat/chat/agent-chat.service.ts:22](../modules/agent-chat/chat/agent-chat.service.ts#L22) `AgentChatService.stream()`  
-> [src/modules/agent-chat/chat/agent-chat.service.ts:50](../modules/agent-chat/chat/agent-chat.service.ts#L50) `runtime.stream(request)`

## 共同运行时

[src/ai-runtime/agent-runtime.service.ts:27](agent-runtime.service.ts#L27) `AgentRuntimeService.stream()`  
-> [src/ai-runtime/context/agent-context.builder.ts:20](context/agent-context.builder.ts#L20) `AgentContextBuilder.build()`  
-> [src/ai-runtime/capability/capability-resolver.service.ts:11](capability/capability-resolver.service.ts#L11) `CapabilityResolver.resolve()`  
-> [src/ai-runtime/planner/agent-planner.service.ts:14](planner/agent-planner.service.ts#L14) `AgentPlanner.plan()`  
-> [src/ai-runtime/planner/rule-planner.service.ts:17](planner/rule-planner.service.ts#L17) `RulePlanner.plan()`  
-> [src/ai-runtime/planner/rule-planner.service.ts:26](planner/rule-planner.service.ts#L26) `RulePlanner.createStep()`

## 第一次 AI：判断走哪条路

[src/ai-runtime/planner/rule-planner.service.ts:34](planner/rule-planner.service.ts#L34) `RulePlanner.classifyIntent()`  
-> [src/ai-runtime/planner/intent-classifier.service.ts:29](planner/intent-classifier.service.ts#L29) `IntentClassifierService.classify()`  
-> [src/ai-runtime/planner/intent-classifier.service.ts:30](planner/intent-classifier.service.ts#L30) `llmClient.invokeWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:37](llm/llm.service.ts#L37) `LlmService.invokeWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:40](llm/llm.service.ts#L40) `chat.completions.create()`

这一步只让 AI 返回 `chat / rag / tool / workflow` 的结构化判断。

## 回到计划校验和分发

[src/ai-runtime/planner/rule-planner.service.ts:57](planner/rule-planner.service.ts#L57) `RulePlanner.resolveCapability()`  
-> [src/ai-runtime/planner/rule-planner.service.ts:68](planner/rule-planner.service.ts#L68) `RulePlanner.createCapabilityStep()`  
-> [src/ai-runtime/validator/agent-plan-validator.service.ts:12](validator/agent-plan-validator.service.ts#L12) `AgentPlanValidator.validate()`  
-> [src/ai-runtime/composer/agent-composer.service.ts:18](composer/agent-composer.service.ts#L18) `AgentComposer.createPlanEvent()`  
-> [src/ai-runtime/trace/agent-trace.service.ts:17](trace/agent-trace.service.ts#L17) `AgentTraceService.start()`  
-> [src/ai-runtime/executor/agent-capability-executor.service.ts:14](executor/agent-capability-executor.service.ts#L14) `AgentCapabilityExecutor.execute()`  
-> [src/ai-runtime/executor/agent-capability-executor.service.ts:16](executor/agent-capability-executor.service.ts#L16) `registry.get(step.capability)`  
-> [src/ai-runtime/capability/capability-registry.service.ts:20](capability/capability-registry.service.ts#L20) `CapabilityRegistry.get()`

从这里开始按 `step.capability` 分叉。

## chat 普通对话路线

`step.capability = chat`  
-> [src/ai-runtime/executor/handlers/chat.handler.ts:17](executor/handlers/chat.handler.ts#L17) `ChatHandler.execute()`  
-> [src/ai-runtime/executor/handlers/chat.handler.ts:24](executor/handlers/chat.handler.ts#L24) `llmService.streamWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:52](llm/llm.service.ts#L52) `LlmService.streamWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:58](llm/llm.service.ts#L58) `chat.completions.create({ stream: true })`

这条路线会流式生成普通对话回答。

## rag 知识库路线

`step.capability = rag`  
-> [src/ai-runtime/executor/handlers/rag.handler.ts:17](executor/handlers/rag.handler.ts#L17) `RagHandler.execute()`  
-> [src/ai-runtime/knowledge/knowledge-qa.service.ts:25](knowledge/knowledge-qa.service.ts#L25) `KnowledgeQAService.answer()`  
-> [src/ai-runtime/knowledge/knowledge-qa.service.ts:45](knowledge/knowledge-qa.service.ts#L45) `KnowledgeQAService.buildCompletion()`  
-> [src/ai-runtime/vector/vector-store.service.ts:110](vector/vector-store.service.ts#L110) `VectorStoreService.similaritySearch()`  
-> [src/ai-runtime/knowledge/knowledge-qa.service.ts:27](knowledge/knowledge-qa.service.ts#L27) `llmService.invokeWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:37](llm/llm.service.ts#L37) `LlmService.invokeWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:40](llm/llm.service.ts#L40) `chat.completions.create()`

这条路线会先检索知识库，再让 AI 根据证据生成回答。

## tool 工具路线

`step.capability = tool`  
-> [src/ai-runtime/executor/handlers/tool.handler.ts:17](executor/handlers/tool.handler.ts#L17) `ToolHandler.execute()`  
-> [src/ai-runtime/executor/handlers/tool.handler.ts:31](executor/handlers/tool.handler.ts#L31) `toolExecutor.execute()`  
-> [src/ai-runtime/tools/default-tool.executor.ts:23](tools/default-tool.executor.ts#L23) `DefaultToolExecutor.execute()`

这条路线本身不再调用 AI，只产出 `tool_start / tool_done`。

## workflow 工作流路线

`step.capability = workflow`  
-> [src/ai-runtime/executor/handlers/workflow.handler.ts:17](executor/handlers/workflow.handler.ts#L17) `WorkflowHandler.execute()`  
-> [src/ai-runtime/executor/handlers/workflow.handler.ts:19](executor/handlers/workflow.handler.ts#L19) `workflowRuntimeService.stream()`  
-> [src/ai-runtime/workflow/workflow-runtime.service.ts:24](workflow/workflow-runtime.service.ts#L24) `WorkflowRuntimeService.stream()`  
-> [src/ai-runtime/workflow/workflow-runtime.service.ts:26](workflow/workflow-runtime.service.ts#L26) `executor.streamExecute()`  
-> [src/ai-runtime/workflow/workflow-executor.service.ts:56](workflow/workflow-executor.service.ts#L56) `WorkflowExecutorService.streamExecute()`

如果工作流遇到 LLM 节点：

[src/ai-runtime/workflow/workflow-executor.service.ts:86](workflow/workflow-executor.service.ts#L86) `yield* this.streamLlmNode(...)`  
-> [src/ai-runtime/workflow/workflow-executor.service.ts:262](workflow/workflow-executor.service.ts#L262) `WorkflowExecutorService.streamLlmNode()`  
-> [src/ai-runtime/workflow/workflow-executor.service.ts:271](workflow/workflow-executor.service.ts#L271) `llmService.streamWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:52](llm/llm.service.ts#L52) `LlmService.streamWithMessages()`  
-> [src/ai-runtime/llm/llm.service.ts:58](llm/llm.service.ts#L58) `chat.completions.create({ stream: true })`

如果工作流遇到 knowledge 节点：

[src/ai-runtime/workflow/workflow-executor.service.ts:214](workflow/workflow-executor.service.ts#L214) `vectorStore.similaritySearch()`

如果工作流遇到 tool 节点：

[src/ai-runtime/workflow/workflow-executor.service.ts:245](workflow/workflow-executor.service.ts#L245) `toolExecutor.execute()`

## 最常用断点

[src/ai-runtime/planner/intent-classifier.service.ts:30](planner/intent-classifier.service.ts#L30) 看意图识别发给 AI 的 messages。

[src/ai-runtime/planner/rule-planner.service.ts:57](planner/rule-planner.service.ts#L57) 看 AI 判断是否被接受，还是回退到 chat。

[src/ai-runtime/executor/agent-capability-executor.service.ts:16](executor/agent-capability-executor.service.ts#L16) 看最终 `step.capability` 进入哪个 handler。

[src/ai-runtime/llm/llm.service.ts:40](llm/llm.service.ts#L40) 看非流式 AI 请求。

[src/ai-runtime/llm/llm.service.ts:58](llm/llm.service.ts#L58) 看流式 AI 请求。
