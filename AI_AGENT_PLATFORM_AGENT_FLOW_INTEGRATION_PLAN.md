# AI Agent Runtime Scheme Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `AiAgent` into the single user-facing runtime scheme that combines prompts, model parameters, knowledge mode, tools, workflows, and chat selection, including streaming support for workflow-bound agents.

**Architecture:** Keep `knowledge-bot` as the public chat API and keep `ai-engine` as the runtime capability layer. `AiAgent` remains the integration record: the admin UI configures one agent scheme, the chat UI selects one enabled scheme, and the backend resolves direct chat or workflow execution from that single `agentCode`.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL, existing `AIRegistry`, existing `WorkflowRuntimeService`, OpenAI-compatible streaming APIs, Vue 2, Element UI, existing `src/api/ai.js`, existing AIEngine pages, existing RBAC/menu seed pattern.

---

## 1. Current Baseline

The current backend already has these runtime and configuration pieces:

- `AiPrompt`, `AiSensitiveWord`, `AiAgent`, `AiWorkflow`, `AiWorkflowNode`, `AiWorkflowEdge`, `AiSkillPackage`, `AiWorkflowRun`, and `AiWorkflowRunStep` in `prisma/schema.prisma`.
- `AiAgent.workflowCode` can bind an agent to a workflow.
- `ChatRequestDto.agentCode` already exists.
- Non-stream chat already detects `agent.workflowCode` and calls `WorkflowRuntimeService.execute(...)`.
- Stream chat currently rejects workflow-bound agents with `BadRequestException('工作流智能体暂不支持流式对话')`.
- `LlmService.streamWithMessages(...)` already supports model streaming.
- `WorkflowExecutorService` currently executes the full graph and returns one final `WorkflowExecutionResult`.
- The frontend chat page still only exposes `mode` and does not send/select `agentCode`.
- The frontend agent page still uses free text for `promptCode` and comma-separated text for `toolCodes`.

## 2. Target Product Contract

Runtime scheme means one `AiAgent` record:

```text
AiAgent
= basic information
+ promptCode
+ model / temperature / topP
+ mode / knowledgeEnabled
+ toolCodes
+ optional workflowCode
```

User-facing rules:

- Chat users select one enabled runtime scheme.
- Chat requests send `agentCode`.
- The selected agent decides chat mode, prompt, model parameters, tool allowlist, knowledge behavior, and workflow binding.
- The chat page must not ask users to separately choose prompt, tools, workflow, and model.
- Workflow-bound agents support streaming in this plan.
- Workflow streaming emits both execution status events and model text events through the existing SSE endpoint.

## 3. Event Contract For Workflow Streaming

Keep the existing SSE shape:

```text
data: {"type":"content","content":"..."}
data: {"type":"sources","sources":[]}
data: [DONE]
```

Extend it with workflow events while preserving existing `content` and `sources` consumers:

```json
{"type":"workflow_start","runId":"xxx","workflowCode":"customer_service_flow"}
{"type":"node_start","nodeKey":"llm_1","nodeType":"llm","name":"生成回答"}
{"type":"node_end","nodeKey":"llm_1","nodeType":"llm","output":{"answer":"..."}}
{"type":"content","content":"模型流式片段"}
{"type":"sources","sources":[]}
{"type":"workflow_done","runId":"xxx","answer":"完整回答"}
```

Rules:

- Direct agents continue to emit only `content` and final `sources`.
- Workflow agents emit workflow events and `content`.
- The first version allows only one streaming `llm` node per workflow execution.
- Non-LLM workflow nodes can emit start/end events only after each node starts or finishes.
- The final stored assistant message uses the accumulated, post-check answer.
- Sensitive-word output checking remains final-answer checking in this plan. The plan must document that already-sent chunks are not protected by final replacement.

## 4. File Map

### Backend

- Modify: `prisma/seeds/menu.ts`
  - Rename the existing AI menu label from "智能体管理" to "运行方案配置" if the product label is approved.
- Modify: `src/modules/ai-platform/agent/agent.controller.ts`
  - Add the config options endpoint for prompts, tools, and workflows.
- Modify: `src/modules/ai-platform/agent/agent.service.ts`
  - Return richer enabled agent options.
  - Return selectable prompt/workflow/tool options.
- Modify: `src/modules/ai-platform/agent/dto/agent.dto.ts`
  - Add option DTOs only if Swagger typing is needed.
- Modify: `src/modules/knowledge-bot/conversation/dto/conversation.dto.ts`
  - Add `agentCode` to list and create DTOs.
- Modify: `src/modules/knowledge-bot/conversation/conversation.service.ts`
  - Filter list by `agentCode`.
  - Persist `agentCode` when explicitly creating a conversation.
  - Return `agentCode` in list records.
- Modify: `src/modules/knowledge-bot/chat/chat.service.ts`
  - Remove the workflow-stream rejection.
  - Delegate workflow-bound stream requests to `WorkflowRuntimeService.stream(...)`.
  - Continue storing user and assistant messages with `agentCode`, `promptCode`, and `workflowCode`.
- Modify: `src/ai-engine/workflow/workflow.types.ts`
  - Add workflow stream event types.
- Modify: `src/ai-engine/workflow/workflow-runtime.service.ts`
  - Add `stream(workflowCode, input)`.
- Modify: `src/ai-engine/workflow/workflow-executor.service.ts`
  - Add streaming graph execution.
  - Stream LLM node output through `LlmService.streamWithMessages(...)`.
  - Emit node start/end and workflow start/done events.
- Modify: `src/ai-engine/workflow/workflow-run-logger.service.ts`
  - Support run start, step start/end, and final output without leaking secrets.
- Test: `src/ai-engine/workflow/workflow-executor.service.spec.ts`
  - Add workflow streaming tests.
- Test: `test` or module-level tests as existing project style allows
  - Add chat stream tests for workflow-bound agents if current test harness can mock LLM and Prisma safely.

### Frontend

- Modify: `vue-element-admin-dev/src/api/ai.js`
  - Add `getAgentConfigOptions`.
  - Ensure `sendAiChat` is available for non-stream fallback and test runs.
- Modify: `vue-element-admin-dev/src/views/AIEngine/agent/index.vue`
  - Change agent form into runtime scheme configuration.
  - Use prompt select, workflow select, and tool multi-select.
  - Add a test-run dialog.
- Modify: `vue-element-admin-dev/src/views/AIEngine/chat/index.vue`
  - Load enabled runtime schemes.
  - Let users select one scheme.
  - Send `agentCode`.
  - Parse workflow stream events.
  - Filter conversations by selected `agentCode`.
- Modify: `vue-element-admin-dev/doc/code/AIEngine/agent.md`
  - Document the runtime scheme contract.
- Modify: `vue-element-admin-dev/doc/code/AIEngine/chat.md`
  - Document agent selection and workflow stream behavior.
- Test: `vue-element-admin-dev/tests/aiPlatformPagesContract.test.js`
  - Assert prompt/workflow/tool selector contracts.
- Test: `vue-element-admin-dev/tests/aiChatStreamContract.test.js`
  - Assert `agentCode` request payload and workflow event parsing.

## 5. Task 1: Backend Agent Option APIs

**Files:**

- Modify: `src/modules/ai-platform/agent/agent.controller.ts`
- Modify: `src/modules/ai-platform/agent/agent.service.ts`
- Modify: `src/modules/ai-platform/agent/dto/agent.dto.ts`

Steps:

- [ ] Extend `enabledOptions()` to select `workflowCode`, `promptCode`, `model`, `knowledgeEnabled`, and `toolCodes`.
- [ ] Add `GET /ai-platform/agent/config-options`.
- [ ] In `AgentService.configOptions()`, query enabled prompts with `code`, `name`, and `scene`.
- [ ] In `AgentService.configOptions()`, query enabled workflows with `code`, `name`, and `description`.
- [ ] In `AgentService.configOptions()`, return tools from `AIRegistry.getToolNames()`.
- [ ] Add `@Permissions('ai:agent:list')` to the new endpoint.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- `GET /ai-platform/agent/enabled-options` returns enough data for the chat page scheme summary.
- `GET /ai-platform/agent/config-options` returns only enabled prompts and workflows.
- Unknown runtime tool names are not invented by the endpoint.
- TypeScript passes.

## 6. Task 2: Backend Conversation Agent Filtering

**Files:**

- Modify: `src/modules/knowledge-bot/conversation/dto/conversation.dto.ts`
- Modify: `src/modules/knowledge-bot/conversation/conversation.service.ts`

Steps:

- [ ] Add optional `agentCode?: string` to `ConversationListDto`.
- [ ] Add optional `agentCode?: string` to `CreateConversationDto`.
- [ ] In `ConversationService.list()`, add `agentCode` to the `where` condition only when the query passes it.
- [ ] In `ConversationService.list()`, include `agentCode` in selected fields.
- [ ] In `ConversationService.create()`, write `agentCode` when provided.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- Conversation list can be filtered by selected runtime scheme.
- Existing mode filtering still works.
- Existing conversation creation without `agentCode` remains compatible.

## 7. Task 3: Backend Workflow Streaming Types

**Files:**

- Modify: `src/ai-engine/workflow/workflow.types.ts`

Steps:

- [ ] Add `WorkflowStreamEvent` union type.
- [ ] Include event variants for `workflow_start`, `node_start`, `node_end`, `content`, `sources`, and `workflow_done`.
- [ ] Keep event fields serializable as JSON.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- Workflow stream events are typed once and reused by runtime and chat service.
- Existing non-stream workflow result type remains unchanged.

## 8. Task 4: Backend Workflow Runtime Stream Entry

**Files:**

- Modify: `src/ai-engine/workflow/workflow-runtime.service.ts`
- Modify: `src/ai-engine/workflow/workflow-executor.service.ts`

Steps:

- [ ] Add `WorkflowRuntimeService.stream(workflowCode, input)`.
- [ ] Load the same enabled workflow graph as `execute()`.
- [ ] Reuse `WorkflowValidatorService.validateGraph(...)`.
- [ ] Delegate to `WorkflowExecutorService.streamExecute(graph, input)`.
- [ ] Keep `execute()` behavior unchanged.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- Non-stream workflow execution still returns the same result.
- Stream workflow execution can load, validate, and start the same workflow graph.

## 9. Task 5: Backend Workflow Executor Streaming

**Files:**

- Modify: `src/ai-engine/workflow/workflow-executor.service.ts`
- Modify: `src/ai-engine/workflow/workflow-run-logger.service.ts`
- Test: `src/ai-engine/workflow/workflow-executor.service.spec.ts`

Steps:

- [ ] Add `async *streamExecute(graph, input)`.
- [ ] Start a workflow run before the first node and yield `workflow_start`.
- [ ] Before each node runs, yield `node_start`.
- [ ] For non-LLM nodes, reuse the existing node logic and yield `node_end`.
- [ ] For `llm` nodes, build messages using the same logic as the existing `llm` branch.
- [ ] For streaming `llm` nodes, call `this.llmService.streamWithMessages(messages, input.llmOptions)`.
- [ ] Accumulate streamed chunks into `answer`.
- [ ] Yield `{ type: 'content', content }` for each model chunk.
- [ ] Write the accumulated answer to `values[config.outputField]`.
- [ ] Yield `node_end` for the LLM node after the stream completes.
- [ ] When the `output` node is reached, yield `sources` and `workflow_done`.
- [ ] Finish the workflow run with final answer and sources.
- [ ] On errors, log failed run and rethrow.
- [ ] Add a unit test for `start -> prompt -> llm -> output` streaming.
- [ ] Add a unit test that a workflow with two streaming LLM nodes fails clearly.
- [ ] Run `npm.cmd test -- workflow-executor.service.spec.ts --runInBand`.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- A workflow-bound agent can produce streamed content.
- Node events are emitted in execution order.
- The final `workflow_done.answer` equals the concatenated streamed chunks.
- Run logs are written even when streaming fails.
- Multiple streaming LLM nodes are rejected in the first version.

## 10. Task 6: Backend Chat Stream Uses Workflow Stream

**Files:**

- Modify: `src/modules/knowledge-bot/chat/chat.service.ts`
- Modify: `src/modules/knowledge-bot/chat/chat.controller.ts` only if controller event writing needs a small adjustment.

Steps:

- [ ] Remove the workflow-bound `BadRequestException` from `ChatService.stream()`.
- [ ] Keep input sensitive word checking before workflow execution.
- [ ] Create or load the conversation before streaming starts.
- [ ] Save the user message before streaming starts.
- [ ] If `agent.workflowCode` exists, call `WorkflowRuntimeService.stream(...)`.
- [ ] Yield workflow stream events directly to the controller.
- [ ] Accumulate `content` events into the final answer.
- [ ] After stream completion, run output sensitive word checking on the accumulated answer.
- [ ] Store the assistant message with `agentCode`, `promptCode`, and `workflowCode`.
- [ ] Yield final `sources` if the workflow did not already yield them.
- [ ] Preserve direct-agent stream behavior.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- Direct stream chat remains compatible with existing frontend SSE parser.
- Workflow stream chat no longer rejects `workflowCode`.
- Assistant messages are saved after workflow stream completion.
- Final stored answer uses checked output content.

## 11. Task 7: Frontend API Wrappers

**Files:**

- Modify: `vue-element-admin-dev/src/api/ai.js`

Steps:

- [ ] Add `getAgentConfigOptions`.
- [ ] Keep `getAgentEnabledOptions`.
- [ ] Keep `sendAiChat` and `sendAiChatStream` signatures unchanged.
- [ ] Run `node tests/aiApiContract.test.js` if this test still matches current API expectations.

Validation:

- API wrappers cover runtime scheme options.
- Existing chat, knowledge, prompt, sensitive word, and agent APIs remain unchanged.

## 12. Task 8: Frontend Runtime Scheme Configuration Page

**Files:**

- Modify: `vue-element-admin-dev/src/views/AIEngine/agent/index.vue`
- Modify: `vue-element-admin-dev/doc/code/AIEngine/agent.md`
- Test: `vue-element-admin-dev/tests/aiPlatformPagesContract.test.js`

Steps:

- [ ] Load `getAgentConfigOptions()` when opening the add/edit dialog.
- [ ] Replace prompt free text with an `el-select` bound to `form.promptCode`.
- [ ] Replace tool comma textarea with an `el-select` using `multiple` and bound to `form.toolCodes`.
- [ ] Add workflow `el-select` bound to `form.workflowCode`.
- [ ] Preserve existing fields `code`, `name`, `description`, `mode`, `knowledgeEnabled`, `model`, `temperature`, `topP`, `status`, and `remark`.
- [ ] Show workflow-related helper text when `form.workflowCode` has a value: `工作流方案将按工作流节点顺序执行，并支持流式输出。`
- [ ] Remove `toolCodesText` after multi-select replaces it.
- [ ] Submit `toolCodes` as an array.
- [ ] Add list columns or compact tags for workflow, knowledge switch, and tool count.
- [ ] Add contract assertions for prompt select, workflow select, and tool multi-select.
- [ ] Update `doc/code/AIEngine/agent.md`.
- [ ] Run `node tests/aiPlatformPagesContract.test.js`.

Validation:

- Admin users configure one complete runtime scheme without manually typing prompt/tool/workflow codes.
- Existing create, edit, and status actions still work.
- The page still follows current Element UI and local admin page patterns.

## 13. Task 9: Frontend Chat Selects Runtime Scheme

**Files:**

- Modify: `vue-element-admin-dev/src/views/AIEngine/chat/index.vue`
- Modify: `vue-element-admin-dev/doc/code/AIEngine/chat.md`
- Test: `vue-element-admin-dev/tests/aiChatStreamContract.test.js`
- Test: `vue-element-admin-dev/tests/aiChatConversationContract.test.js`

Steps:

- [ ] Load enabled agent options on page creation.
- [ ] Add a runtime scheme select near the chat header.
- [ ] Store `selectedAgentCode`.
- [ ] Derive current selected agent from enabled options.
- [ ] Display selected scheme summary: mode, model, promptCode, workflowCode, knowledgeEnabled, and tool count.
- [ ] On scheme change, clear `activeConversationId` and `messageList`.
- [ ] On scheme change, reload conversation list with `agentCode: selectedAgentCode`.
- [ ] In `getConversationList()`, include `agentCode` when selected.
- [ ] In `handleCreateConversation()`, include `agentCode` and mode from the selected agent.
- [ ] In `handleSendMessage()`, include `agentCode` in the request payload.
- [ ] Keep the existing SSE parser for `content` and `sources`.
- [ ] Add parsing for `workflow_start`, `node_start`, `node_end`, and `workflow_done`.
- [ ] Show workflow state in the existing message area or a compact status row. Keep this small and do not add a separate visual editor.
- [ ] Update chat docs.
- [ ] Run chat contract tests.

Validation:

- Chat requests include `agentCode`.
- Changing schemes changes the conversation list.
- Workflow stream events do not break existing content rendering.
- Existing direct chat still streams content.

## 14. Task 10: Frontend Runtime Scheme Test Run

**Files:**

- Modify: `vue-element-admin-dev/src/views/AIEngine/agent/index.vue`

Steps:

- [ ] Add a `测试` action button in the agent table.
- [ ] Open a small dialog with one textarea for the test question.
- [ ] Submit the selected agent code and message through `sendAiChatStream`.
- [ ] Parse direct and workflow stream events in the test dialog.
- [ ] Display final answer and workflow status events.
- [ ] Keep the test dialog read-only for returned events; do not add graph editing here.

Validation:

- Admin users can test a runtime scheme without leaving the configuration page.
- Workflow-bound schemes stream through the same backend stream endpoint.
- Test run does not create new frontend-only configuration state.

## 15. Task 11: Backend Menu And Permission Sync

**Files:**

- Modify: `nestjs-prisma/prisma/seeds/menu.ts`
- Check: `nestjs-prisma/prisma/seeds/permission.ts`

Steps:

- [ ] Rename the menu entry currently named `智能体管理` to `运行方案配置`.
- [ ] Keep route path `/AIEngine/agent/index` and component `/AIEngine/agent/index`.
- [ ] Keep existing permission codes `ai:agent:list`, `ai:agent:add`, `ai:agent:update`, and `ai:agent:status`.
- [ ] Do not add a new menu unless the route truly changes.
- [ ] Run the existing menu seed contract test if available.

Validation:

- Backend menu label matches the new product meaning.
- Existing route and permission contract remains stable.
- No duplicate AI menu is introduced.

## 16. Task 12: Final Verification

**Backend commands:**

```powershell
cd F:\公司项目\开发中完整项目\nestjs-prisma
npx.cmd tsc --noEmit
npm.cmd test -- workflow-executor.service.spec.ts --runInBand
```

Run these when database and auth environment are available:

```powershell
npm.cmd run test:e2e -- --runInBand
```

**Frontend commands:**

```powershell
cd F:\公司项目\开发中完整项目\vue-element-admin-dev
node tests/aiPlatformPagesContract.test.js
node tests/aiChatStreamContract.test.js
node tests/aiChatConversationContract.test.js
```

Run build if the local environment is available:

```powershell
npm.cmd run build:stage
```

Final checks:

```powershell
git diff --check
```

Acceptance criteria:

- A runtime scheme can be configured from enabled prompts, registered tools, and enabled workflows.
- The chat page can select a runtime scheme and sends `agentCode`.
- Conversations can be filtered by selected runtime scheme.
- Direct agents still stream normally.
- Workflow-bound agents stream through the same chat stream endpoint.
- Workflow stream events include node status and model content.
- Assistant messages are stored with `agentCode`, `promptCode`, and `workflowCode`.
- Backend menu label is synchronized to the runtime scheme concept.
- Frontend docs and backend behavior describe the same contract.

## 17. Out Of Scope For This Plan

- Visual workflow graph editor redesign.
- User-authored JavaScript or SQL tools.
- Multi-agent collaboration.
- Public skill marketplace.
- Immutable workflow version snapshots.
- Real-time chunk-level sensitive word blocking. This plan keeps final-answer checking and explicitly records the residual streaming risk.
