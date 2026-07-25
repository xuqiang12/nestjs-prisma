# AI Agent Platform Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Phase 1 configurable agent platform with workflow orchestration, skill packages, execution logs, and safer tool governance.

**Architecture:** Keep Phase 1 agents as the main user-facing configuration unit. Add workflows as optional execution strategies that an agent can bind to, and add skill packages as reusable bundles of prompts, tools, knowledge scope, and workflow templates.

**Tech Stack:** NestJS 10, TypeScript, Prisma 5, PostgreSQL, `nestjs-prisma`, existing `AIRegistry`, existing `AiOrchestratorService`, OpenAI-compatible chat APIs, existing RBAC and Swagger grouping.

---

## 1. Dependency On Phase 1

Phase 2 should start only after Phase 1 is stable:

- `AiPrompt` exists and can be enabled or disabled.
- `AiSensitiveWord` exists and is used by runtime.
- `AiAgent` exists and can drive the chat flow.
- Chat supports selecting an agent through `agentCode`.
- Agent runtime can resolve prompt, model parameters, tool allowlist, and knowledge mode.

If Phase 1 is not complete, do not start workflow or skill package implementation. The workflow layer depends on stable agent and prompt contracts.

## 2. Phase 2 Scope

Phase 2 implements:

- Workflow definition management.
- Workflow node and edge management.
- Workflow execution engine with a small fixed set of node types.
- Agent-to-workflow binding.
- Skill package management.
- Skill package installation into an agent.
- Workflow execution logs for debugging and replay.
- Tool governance based on backend-registered tool allowlists.

Phase 2 does not implement:

- Admin-authored JavaScript execution.
- User-authored SQL execution.
- Public marketplace uploads.
- Cross-tenant skill sharing.
- Visual drag-and-drop editor as a backend requirement.
- Multi-agent debate or autonomous planning loops.

## 3. Workflow Positioning

Workflow is not a replacement for agent configuration.

Recommended relationship:

```text
AiAgent
-> optional workflowCode
-> AiWorkflow
-> AiWorkflowNode[]
-> AiWorkflowEdge[]
-> execution result
```

Rules:

- If an agent has no workflow, it uses the Phase 1 direct chat flow.
- If an agent has a workflow, chat enters the workflow engine.
- The workflow engine may call LLM, knowledge retrieval, and registered backend tools.
- Workflow nodes must be selected from backend-supported node types.
- Workflow configuration can choose tool names, but cannot define executable tool code.

## 4. Node Types For First Workflow Version

Keep the first workflow version small:

```text
start       receives user input and initial context
prompt      renders a prompt template
knowledge   searches the knowledge base
llm         calls the chat model
tool        executes one backend-registered tool
condition   chooses next edge based on simple field comparison
output      returns the final result
```

Recommended rule: implement these node types first, and reject unsupported node types during save and execution.

## 5. Data Model Plan

### 5.1 AiWorkflow

Purpose: define a named workflow that can be bound to an agent.

Suggested fields:

```text
id          String   primary key
code        String   unique
name        String
description String?
status      Int      1 enabled, 0 disabled
version     Int
remark      String?
createdAt   DateTime
updatedAt   DateTime
```

Rules:

- `code` is the stable binding key used by agents.
- A disabled workflow cannot be executed by an agent.
- Phase 2 can update workflows in place; version snapshotting can be introduced later if rollback becomes necessary.

### 5.2 AiWorkflowNode

Purpose: store one node inside a workflow.

Suggested fields:

```text
id          String   primary key
workflowId  String
nodeKey     String   unique inside workflow
type        String   start, prompt, knowledge, llm, tool, condition, output
name        String
config      Json
sortNo      Int
createdAt   DateTime
updatedAt   DateTime
```

Rules:

- `nodeKey` is used by edges and execution state.
- `config` shape depends on `type`.
- Validate `config` before saving.
- A workflow must have exactly one `start` node and at least one `output` node.

### 5.3 AiWorkflowEdge

Purpose: define node transitions.

Suggested fields:

```text
id          String   primary key
workflowId  String
fromNodeKey String
toNodeKey   String
condition   Json?
sortNo      Int
createdAt   DateTime
updatedAt   DateTime
```

Rules:

- `fromNodeKey` and `toNodeKey` must exist in the same workflow.
- Phase 2 supports directed acyclic workflow execution.
- Loops should be rejected in the first version.

### 5.4 AiSkillPackage

Purpose: define reusable bundles that can configure or create an agent.

Suggested fields:

```text
id            String   primary key
code          String   unique
name          String
description   String?
promptCodes   Json?
toolCodes     Json?
workflowCode  String?
agentDefaults Json?
status        Int      1 enabled, 0 disabled
remark        String?
createdAt     DateTime
updatedAt     DateTime
```

Rules:

- Skill packages are internal templates in Phase 2.
- Installing a package copies or binds selected configuration into an agent.
- A disabled package cannot be installed.
- Package configuration must only reference enabled prompts, enabled workflows, and known backend tools.

### 5.5 AiWorkflowRun

Purpose: store one workflow execution summary.

Suggested fields:

```text
id              String   primary key
conversationId  String?
messageId       String?
agentCode       String
workflowCode    String
status          String   running, success, failed
input           Json
output          Json?
errorMessage    String?
startedAt       DateTime
finishedAt      DateTime?
createdAt       DateTime
```

### 5.6 AiWorkflowRunStep

Purpose: store each node execution result for debugging.

Suggested fields:

```text
id              String   primary key
runId           String
nodeKey         String
nodeType        String
status          String   success, skipped, failed
input           Json?
output          Json?
errorMessage    String?
startedAt       DateTime
finishedAt      DateTime?
createdAt       DateTime
```

Rules:

- Do not store raw API keys, database URLs, or user password data in logs.
- Long LLM output can be truncated in logs if storage size becomes a concern.

## 6. Workflow Node Config Shapes

### 6.1 start

```json
{
  "inputField": "message"
}
```

### 6.2 prompt

```json
{
  "promptCode": "default_customer_service",
  "outputField": "renderedPrompt"
}
```

### 6.3 knowledge

```json
{
  "queryField": "message",
  "limit": 5,
  "outputField": "knowledgeSources"
}
```

### 6.4 llm

```json
{
  "systemPromptField": "renderedPrompt",
  "userMessageField": "message",
  "outputField": "answer",
  "stream": false
}
```

### 6.5 tool

```json
{
  "toolCode": "get_user_menu_permissions",
  "paramsField": "toolParams",
  "outputField": "toolResult"
}
```

### 6.6 condition

```json
{
  "field": "route",
  "operator": "equals",
  "value": "knowledge"
}
```

### 6.7 output

```json
{
  "outputField": "answer"
}
```

## 7. API Contract Plan

### 7.1 Workflow Management

```text
GET  /ai-platform/workflow/list
GET  /ai-platform/workflow/detail?id=xxx
POST /ai-platform/workflow
POST /ai-platform/workflow/update
POST /ai-platform/workflow/status
POST /ai-platform/workflow/save-graph
POST /ai-platform/workflow/validate
POST /ai-platform/workflow/test-run
```

Permission codes:

```text
ai:workflow:list
ai:workflow:add
ai:workflow:update
ai:workflow:status
ai:workflow:test
```

### 7.2 Skill Package Management

```text
GET  /ai-platform/skill-package/list
GET  /ai-platform/skill-package/detail?id=xxx
POST /ai-platform/skill-package
POST /ai-platform/skill-package/update
POST /ai-platform/skill-package/status
POST /ai-platform/skill-package/install-to-agent
```

Permission codes:

```text
ai:skill-package:list
ai:skill-package:add
ai:skill-package:update
ai:skill-package:status
ai:skill-package:install
```

### 7.3 Workflow Run Logs

```text
GET /ai-platform/workflow-run/list
GET /ai-platform/workflow-run/detail?id=xxx
```

Permission codes:

```text
ai:workflow-run:list
ai:workflow-run:detail
```

## 8. Runtime Flow

### 8.1 Direct Agent Flow

This remains the Phase 1 fallback:

```text
ChatService
-> AgentRuntimeService
-> PromptRenderer
-> SensitiveWordChecker
-> AiOrchestratorService
-> LlmService
```

### 8.2 Workflow Agent Flow

Phase 2 adds:

```text
ChatService
-> AgentRuntimeService
-> WorkflowRuntimeService.load(workflowCode)
-> WorkflowValidator.validateGraph()
-> WorkflowExecutor.execute()
-> node runner: start
-> node runner: prompt / knowledge / tool / llm / condition
-> node runner: output
-> WorkflowRunLogger
-> ChatService stores final message
```

Streaming rule:

- Phase 2 can keep streaming on the simple direct-agent path first.
- Workflow streaming should be added only after non-streaming workflow execution is stable.
- If workflow streaming is added, only one `llm` node should be allowed to stream in the first version.

## 9. Implementation Tasks

### Task 1: Add Workflow And Skill Package Prisma Models

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_ai_workflow_skill_package/`

Steps:

- [ ] Add `AiWorkflow`.
- [ ] Add `AiWorkflowNode`.
- [ ] Add `AiWorkflowEdge`.
- [ ] Add `AiSkillPackage`.
- [ ] Add `AiWorkflowRun`.
- [ ] Add `AiWorkflowRunStep`.
- [ ] Add optional `workflowCode` to `AiAgent`.
- [ ] Run `npm.cmd run prisma:generate`.
- [ ] Run `npx.cmd tsc --noEmit`.

Validation:

- Prisma Client exposes workflow, node, edge, skill package, and run log models.
- Existing Phase 1 APIs still compile.
- Existing chat behavior is unchanged before workflow binding is used.

### Task 2: Add Workflow Management APIs

**Files:**

- Create: `src/modules/ai-platform/workflow/*`
- Modify: `src/modules/ai-platform/ai-platform.module.ts`

Steps:

- [ ] Create workflow DTOs.
- [ ] Create workflow service.
- [ ] Create workflow controller.
- [ ] Implement list, detail, create, update, and status APIs.
- [ ] Implement `save-graph` to save nodes and edges in one request.
- [ ] Implement `validate` to check graph consistency.
- [ ] Add permission decorators.

Validation:

- A workflow can be created without nodes.
- A workflow graph can be saved only when all node keys and edges are valid.
- A disabled workflow cannot be selected by an enabled agent.
- `npx.cmd tsc --noEmit` passes.

### Task 3: Add Workflow Graph Validation

**Files:**

- Create: `src/ai-engine/workflow/workflow-validator.service.ts`
- Create: `src/ai-engine/workflow/workflow.types.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`

Steps:

- [ ] Validate exactly one `start` node.
- [ ] Validate at least one `output` node.
- [ ] Validate every edge points to existing nodes.
- [ ] Validate unsupported node types are rejected.
- [ ] Validate the graph has no cycles.
- [ ] Validate each node `config` shape by node type.

Validation:

- Invalid graphs fail before execution.
- Validation errors identify the specific node or edge.
- `npx.cmd tsc --noEmit` passes.

### Task 4: Add Workflow Execution Engine

**Files:**

- Create: `src/ai-engine/workflow/workflow-runtime.service.ts`
- Create: `src/ai-engine/workflow/workflow-executor.service.ts`
- Create: `src/ai-engine/workflow/node-runners/*`
- Modify: `src/ai-engine/ai-engine.module.ts`

Steps:

- [ ] Create a shared workflow execution context.
- [ ] Implement start node runner.
- [ ] Implement prompt node runner.
- [ ] Implement knowledge node runner.
- [ ] Implement llm node runner.
- [ ] Implement tool node runner.
- [ ] Implement condition node runner.
- [ ] Implement output node runner.
- [ ] Execute nodes in graph order.
- [ ] Stop execution when an output node returns final result.

Validation:

- A simple start -> prompt -> llm -> output workflow returns an answer.
- A knowledge workflow can retrieve sources before LLM call.
- A tool workflow can execute only allowed backend tools.
- Unknown node type fails clearly.

### Task 5: Connect Workflow Runtime To Agent Chat

**Files:**

- Modify: `src/ai-engine/agent/agent-runtime.service.ts`
- Modify: `src/modules/knowledge-bot/chat/chat.service.ts`
- Modify: `src/modules/knowledge-bot/conversation/conversation.service.ts`

Steps:

- [ ] Load `workflowCode` from enabled agent configuration.
- [ ] If workflow is missing, keep Phase 1 direct agent flow.
- [ ] If workflow exists, execute through `WorkflowRuntimeService`.
- [ ] Store `workflowCode` on assistant message or workflow run log.
- [ ] Preserve existing non-workflow response shape.

Validation:

- Existing direct-agent chat still works.
- Workflow-bound agent returns a final answer.
- Disabled workflow-bound agent fails before LLM call.
- Conversation detail can identify which workflow produced the answer.

### Task 6: Add Skill Package Management APIs

**Files:**

- Create: `src/modules/ai-platform/skill-package/*`
- Modify: `src/modules/ai-platform/ai-platform.module.ts`

Steps:

- [ ] Create skill package DTOs.
- [ ] Create skill package service.
- [ ] Create skill package controller.
- [ ] Validate referenced prompts, tools, and workflows.
- [ ] Implement install-to-agent.
- [ ] Add permission decorators.

Validation:

- A skill package can be created only with valid references.
- Installing a skill package updates an agent predictably.
- Disabled skill packages cannot be installed.
- Unknown tool names are rejected.

### Task 7: Add Workflow Run Logs

**Files:**

- Create: `src/modules/ai-platform/workflow-run/*`
- Create: `src/ai-engine/workflow/workflow-run-logger.service.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`

Steps:

- [ ] Create workflow run logger service.
- [ ] Log workflow run start.
- [ ] Log each node step result.
- [ ] Log final success or failure.
- [ ] Add workflow run list and detail APIs.
- [ ] Add permission decorators.

Validation:

- A workflow execution creates one run record.
- Each executed node creates one step record.
- Failure logs do not expose secrets.
- Run detail is enough to debug node input and output flow.

### Task 8: Add Menus, Permissions, Swagger Grouping, And Seed Data

**Files:**

- Modify: `prisma/seeds/permission.ts`
- Modify: `prisma/seeds/menu.ts`
- Modify: `src/common/swagger/swagger-docs.ts`
- Modify: `src/common/swagger/swagger-docs.spec.ts`

Steps:

- [ ] Add workflow permission codes.
- [ ] Add skill package permission codes.
- [ ] Add workflow run permission codes.
- [ ] Add menu entries under the AI module.
- [ ] Include new controllers in the AI Swagger group.
- [ ] Update Swagger grouping tests.

Validation:

- Existing AI menus remain unchanged.
- New Phase 2 menus are reachable for authorized roles.
- `npm.cmd test -- swagger-docs.spec.ts --runInBand` passes.

### Task 9: Final Verification

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
- Workflow execution can be tested with mocked LLM and mocked tools.
- No real secret is written to tracked files or workflow logs.

## 10. Phase 2 Acceptance Criteria

Phase 2 is complete when:

- Agents can optionally bind an enabled workflow.
- Workflows can be managed through backend APIs.
- Workflows support the fixed node types listed in this document.
- Workflow graph validation prevents invalid execution plans.
- Skill packages can package prompts, tools, workflow references, and agent defaults.
- Skill packages can be installed into agents.
- Workflow execution logs record run-level and step-level information.
- Direct Phase 1 agent chat remains available.

## 11. Open Decisions Before Coding

- Whether workflow graph editing is backend-only JSON first or needs immediate frontend visual editing support.
- Whether workflow updates modify the current version or create immutable version snapshots.
- Whether skill package installation should copy values into an agent or keep live bindings.
- Whether workflow streaming is required in the first Phase 2 delivery or can wait until after non-streaming workflows are stable.
- Whether workflow run logs should keep full prompt content or only prompt code and rendered variable summary.

