# AI Agent Platform Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable version of a configurable AI agent platform on top of the existing `knowledge-bot` and `ai-engine` modules.

**Architecture:** Keep `src/modules/knowledge-bot` as the business-facing API layer and keep `src/ai-engine` as the reusable AI capability layer. Phase 1 adds database-backed management for prompts, sensitive words, and agents, then lets the existing chat flow load an enabled agent configuration before calling the LLM.

**Tech Stack:** NestJS 10, TypeScript, Prisma 5, PostgreSQL, `nestjs-prisma`, `@nestjs/swagger`, `class-validator`, OpenAI-compatible chat APIs, existing RBAC guards and permission decorators.

---

## 1. Current Baseline

The current backend already has:

- `src/ai-engine`: shared AI infrastructure.
- `src/ai-engine/orchestrator/ai-orchestrator.service.ts`: builds chat or knowledge completion messages.
- `src/ai-engine/llm/llm.service.ts`: calls the OpenAI-compatible chat completion API.
- `src/modules/knowledge-bot`: current business module for AI chat, conversations, and knowledge management.
- `prisma/schema.prisma`: current AI tables are `Document`, `AiConversation`, and `AiMessage`.
- `prisma/seeds/permission.ts` and `prisma/seeds/menu.ts`: current AI permissions and menus.

Phase 1 must not reintroduce the old `/chat` module or create a parallel AI runtime path. All new runtime behavior should enter through `knowledge-bot` and reuse `ai-engine`.

## 2. Phase 1 Scope

Phase 1 implements these capabilities:

- Prompt management.
- Sensitive word management.
- Agent configuration.
- Agent-aware chat request flow.
- Minimal audit fields for later debugging.
- Backend menu and permission wiring for the new management pages.

Phase 1 does not implement:

- Visual workflow editor.
- Workflow node execution engine.
- Skill package marketplace.
- Multi-agent collaboration.
- User-uploaded executable code.
- Arbitrary SQL, JavaScript, or script execution from admin configuration.

## 3. Key Assumptions

- Write APIs continue to use `POST`; read APIs continue to use `GET`.
- Normal JSON responses continue to rely on the global response interceptor.
- Streaming chat still writes SSE manually in the controller.
- Tests must not call real remote LLM, embedding, or database reset flows unless the user explicitly approves.
- New permission codes should follow the current pattern, for example `ai:prompt:list`.
- If a new field or API affects frontend menus, update seed data and Swagger grouping together.

## 4. Target Module Shape

Recommended Phase 1 file layout:

```text
src/modules/ai-platform
├── ai-platform.module.ts
├── prompt
│   ├── prompt.controller.ts
│   ├── prompt.service.ts
│   └── dto
│       ├── create-prompt.dto.ts
│       ├── update-prompt.dto.ts
│       ├── prompt-list.dto.ts
│       └── prompt-status.dto.ts
├── sensitive-word
│   ├── sensitive-word.controller.ts
│   ├── sensitive-word.service.ts
│   └── dto
│       ├── create-sensitive-word.dto.ts
│       ├── update-sensitive-word.dto.ts
│       ├── sensitive-word-list.dto.ts
│       └── sensitive-word-status.dto.ts
└── agent
    ├── agent.controller.ts
    ├── agent.service.ts
    └── dto
        ├── create-agent.dto.ts
        ├── update-agent.dto.ts
        ├── agent-list.dto.ts
        └── agent-status.dto.ts

src/ai-engine
├── prompt
│   └── prompt-renderer.service.ts
├── safety
│   └── sensitive-word-checker.service.ts
└── agent
    ├── agent-runtime.service.ts
    └── agent-runtime.types.ts
```

Responsibility split:

- `ai-platform` owns admin CRUD APIs, DTOs, permissions, and database reads/writes.
- `ai-engine/prompt` owns prompt variable rendering.
- `ai-engine/safety` owns sensitive word checking used by runtime.
- `ai-engine/agent` owns loading one enabled agent and converting it into a runtime completion plan.
- `knowledge-bot/chat` remains the user-facing chat entry and delegates agent loading to `ai-engine/agent`.

## 5. Data Model Plan

### 5.1 AiPrompt

Purpose: store reusable system prompts and task prompts.

Suggested fields:

```text
id          String   primary key
code        String   unique, stable business code
name        String
scene       String   examples: chat, knowledge, customer-service, report
content     String   prompt template content
variables   Json?    example: [{"name":"question","required":true}]
version     Int      starts from 1
status      Int      1 enabled, 0 disabled
remark      String?
createdAt   DateTime
updatedAt   DateTime
```

Rules:

- `code` is the stable reference used by agents.
- `content` supports simple variables like `{question}`, `{context}`, `{history}`.
- Phase 1 does not need a separate prompt version table unless prompt rollback is required immediately.
- If a prompt is already used by an enabled agent, deletion should be blocked or converted to disabled status.

### 5.2 AiSensitiveWord

Purpose: manage exact-match sensitive words for input and output checking.

Suggested fields:

```text
id          String   primary key
word        String
category    String   examples: politics, abuse, privacy, business
action      String   block, replace, record
replaceWith String?
scope       String   input, output, both
status      Int      1 enabled, 0 disabled
remark      String?
createdAt   DateTime
updatedAt   DateTime
```

Rules:

- Phase 1 uses exact keyword matching only.
- `block` stops the request before calling the LLM.
- `replace` replaces matched words before the LLM call or before returning output.
- `record` records the hit but does not block the response.
- Regex matching, semantic moderation, and external moderation APIs are Phase 2 or later.

### 5.3 AiAgent

Purpose: define a configurable agent used by chat.

Suggested fields:

```text
id                String   primary key
code              String   unique, stable business code
name              String
description       String?
promptCode        String
mode              String   chat, knowledge
model             String?
temperature       Float?
topP              Float?
knowledgeEnabled  Boolean
toolCodes         Json?    example: ["search_knowledge", "get_user_menu_permissions"]
status            Int      1 enabled, 0 disabled
remark            String?
createdAt         DateTime
updatedAt         DateTime
```

Rules:

- `code` is what the frontend sends during chat.
- If `model`, `temperature`, or `topP` is empty, runtime falls back to existing environment/default behavior.
- `promptCode` must point to an enabled prompt.
- `toolCodes` must only contain backend-registered tool names from `AIRegistry`.
- Phase 1 supports one agent per chat request, not multi-agent collaboration.

### 5.4 Conversation Extension

Add only fields that are useful for debugging and later replay:

```text
AiConversation.agentCode String?
AiMessage.agentCode      String?
AiMessage.promptCode     String?
```

These fields make it possible to answer: which agent and prompt produced this message?

## 6. API Contract Plan

### 6.1 Prompt Management

```text
GET  /ai-platform/prompt/list
GET  /ai-platform/prompt/detail?id=xxx
POST /ai-platform/prompt
POST /ai-platform/prompt/update
POST /ai-platform/prompt/status
```

Permission codes:

```text
ai:prompt:list
ai:prompt:add
ai:prompt:update
ai:prompt:status
```

### 6.2 Sensitive Word Management

```text
GET  /ai-platform/sensitive-word/list
GET  /ai-platform/sensitive-word/detail?id=xxx
POST /ai-platform/sensitive-word
POST /ai-platform/sensitive-word/update
POST /ai-platform/sensitive-word/status
```

Permission codes:

```text
ai:sensitive-word:list
ai:sensitive-word:add
ai:sensitive-word:update
ai:sensitive-word:status
```

### 6.3 Agent Management

```text
GET  /ai-platform/agent/list
GET  /ai-platform/agent/detail?id=xxx
GET  /ai-platform/agent/enabled-options
POST /ai-platform/agent
POST /ai-platform/agent/update
POST /ai-platform/agent/status
```

Permission codes:

```text
ai:agent:list
ai:agent:add
ai:agent:update
ai:agent:status
```

### 6.4 Agent-Aware Chat

Extend the existing chat DTO:

```text
message          required
conversationId   optional
mode             optional, chat or knowledge
agentCode        optional
```

Runtime rules:

- If `agentCode` is provided, load that enabled agent.
- If `agentCode` is missing, use a default enabled agent or keep the current chat behavior, depending on the final product decision.
- If the agent is disabled or missing, return a clear business error.
- If the prompt is disabled or missing, return a clear business error.
- If input sensitive word action is `block`, do not call the LLM.

## 7. Runtime Flow

Recommended Phase 1 chat flow:

```text
ChatController
-> ChatService
-> AgentRuntimeService.loadAgent(agentCode, mode)
-> SensitiveWordChecker.checkInput(message)
-> ConversationService.getOrCreateForMessage(...)
-> ConversationService.getHistoryMessages(...)
-> PromptRenderer.render(prompt.content, variables)
-> AiOrchestratorService.buildCompletion(...)
-> LlmService.invokeWithMessages(...) or streamWithMessages(...)
-> SensitiveWordChecker.checkOutput(answer)
-> ConversationService.addMessage(...agentCode, promptCode...)
-> return answer or SSE chunks
```

For streaming output, the output sensitive word strategy should be simple in Phase 1:

- Check and record the final accumulated answer after the stream finishes.
- Do not try to block individual chunks in the first version.
- If output action is `replace`, replacement should apply to stored final answer; frontend chunk-level replacement can be planned separately.

## 8. Implementation Tasks

### Task 1: Add Phase 1 Prisma Models

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_ai_agent_platform_phase_1/`

Steps:

- [ ] Add `AiPrompt`, `AiSensitiveWord`, and `AiAgent` models.
- [ ] Add `agentCode` to `AiConversation`.
- [ ] Add `agentCode` and `promptCode` to `AiMessage`.
- [ ] Create a Prisma migration after the schema is reviewed.
- [ ] Run `npm.cmd run prisma:generate`.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- Prisma Client exposes the new models.
- Existing chat and knowledge modules still compile.
- No database reset command is used.

### Task 2: Add Prompt Management APIs

**Files:**

- Create: `src/modules/ai-platform/prompt/*`
- Modify: `src/modules/ai-platform/ai-platform.module.ts`
- Modify: `src/app.module.ts`

Steps:

- [ ] Create prompt DTOs with `class-validator`.
- [ ] Create prompt service with list, detail, create, update, and status methods.
- [ ] Create prompt controller using only `GET` and `POST`.
- [ ] Add permission decorators.
- [ ] Register the prompt service and controller in `AiPlatformModule`.
- [ ] Import `AiPlatformModule` in `AppModule`.

Validation:

- `GET /ai-platform/prompt/list` requires auth and permission.
- `POST /ai-platform/prompt` rejects duplicate `code`.
- Disabled prompts cannot be selected by runtime.
- `npx.cmd tsc --noEmit` passes.

### Task 3: Add Sensitive Word Management APIs

**Files:**

- Create: `src/modules/ai-platform/sensitive-word/*`
- Create: `src/ai-engine/safety/sensitive-word-checker.service.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`

Steps:

- [ ] Create sensitive word DTOs.
- [ ] Create sensitive word CRUD service.
- [ ] Create sensitive word controller.
- [ ] Add `SensitiveWordCheckerService`.
- [ ] Register `SensitiveWordCheckerService` in `AIEngineModule`.
- [ ] Add permission decorators.

Validation:

- Enabled words are loaded during runtime checks.
- Disabled words are ignored.
- `block`, `replace`, and `record` actions have deterministic behavior.
- `npx.cmd tsc --noEmit` passes.

### Task 4: Add Agent Management APIs

**Files:**

- Create: `src/modules/ai-platform/agent/*`
- Create: `src/ai-engine/agent/agent-runtime.service.ts`
- Create: `src/ai-engine/agent/agent-runtime.types.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`

Steps:

- [ ] Create agent DTOs.
- [ ] Create agent service with list, detail, create, update, status, and enabled-options.
- [ ] Validate that `promptCode` points to an enabled prompt.
- [ ] Validate that `toolCodes` only contains known tool names.
- [ ] Create `AgentRuntimeService` to load enabled agent configuration for chat.
- [ ] Register agent runtime services in `AIEngineModule`.

Validation:

- Disabled agents cannot be used in chat.
- Agents cannot reference disabled prompts.
- Agents cannot reference unknown tools.
- `npx.cmd tsc --noEmit` passes.

### Task 5: Add Prompt Rendering

**Files:**

- Create: `src/ai-engine/prompt/prompt-renderer.service.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`
- Modify: `src/ai-engine/orchestrator/ai-orchestrator.service.ts`

Steps:

- [ ] Add a small prompt renderer for `{variable}` replacement.
- [ ] Keep missing required variables as a validation error before LLM call.
- [ ] Allow optional variables to render as an empty string.
- [ ] Pass rendered system prompt into `AiOrchestratorService.buildCompletion`.

Validation:

- Knowledge mode still includes retrieved knowledge context.
- Chat mode can include an agent system prompt.
- Existing chat behavior remains available when no agent is selected, if that product decision is confirmed.

### Task 6: Connect Agent Runtime To Chat

**Files:**

- Modify: `src/modules/knowledge-bot/chat/dto/chat.dto.ts`
- Modify: `src/modules/knowledge-bot/chat/chat.service.ts`
- Modify: `src/modules/knowledge-bot/conversation/conversation.service.ts`

Steps:

- [ ] Add optional `agentCode` to chat DTO.
- [ ] Load agent configuration at the start of chat and stream requests.
- [ ] Run input sensitive word checks before calling the LLM.
- [ ] Save `agentCode` and `promptCode` on conversation and assistant message.
- [ ] Run output sensitive word checks after final answer is produced.

Validation:

- Chat can run with a configured agent.
- Sensitive word `block` prevents remote LLM calls.
- Streaming still emits `data: {"type":"content","content":"..."}` and `data: [DONE]`.
- Conversation detail shows enough data to debug agent and prompt usage.

### Task 7: Add Menus, Permissions, Swagger Grouping, And Seed Data

**Files:**

- Modify: `prisma/seeds/permission.ts`
- Modify: `prisma/seeds/menu.ts`
- Modify: `src/common/swagger/swagger-docs.ts`
- Modify: `src/common/swagger/swagger-docs.spec.ts`

Steps:

- [ ] Add Phase 1 permission codes.
- [ ] Add menu entries under the existing AI module.
- [ ] Add button permissions for prompt, sensitive word, and agent management pages.
- [ ] Include `AiPlatformModule` in the AI Swagger group.
- [ ] Update Swagger grouping tests.

Validation:

- AI module shows the new backend API group.
- Existing AI chat and knowledge permissions remain unchanged.
- `npm.cmd test -- swagger-docs.spec.ts --runInBand` passes.

### Task 8: Final Verification

**Files:**

- Check all changed files.

Steps:

- [ ] Run `npm.cmd run prisma:generate` if schema changed.
- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd run test:e2e -- --runInBand` when database and auth environment are available.
- [ ] Run `git diff --check`.

Validation:

- TypeScript compiles.
- Build passes.
- E2E passes or the exact unavailable dependency is recorded.
- No real API key, database URL, or account secret is written to tracked files.

## 9. Phase 1 Acceptance Criteria

Phase 1 is complete when:

- Admin users can manage prompts, sensitive words, and agents through backend APIs.
- A chat request can select an enabled agent by `agentCode`.
- The selected agent controls prompt, model parameters, knowledge mode, and allowed tool names.
- Sensitive word checks run before LLM calls and after final answers.
- Existing `knowledge-bot` chat, streaming, conversation, and knowledge APIs remain compatible.
- Menus, permissions, Swagger grouping, Prisma schema, and seed data are synchronized.

## 10. Open Decisions Before Coding

- Whether `agentCode` is required for every chat request or optional for backward compatibility.
- Whether deleting prompts and agents is allowed, or status disable is the only supported removal action.
- Whether model parameters can be edited by all AI admins or only super admins.
- Whether sensitive word output replacement must affect streaming chunks immediately or only final stored answer in Phase 1.

