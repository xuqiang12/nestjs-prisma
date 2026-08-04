# AI Module Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 AI 后端从“新旧补丁并存”整理成一条清晰主链路：`ChatService -> AgentRuntimeService -> Completion/RAG/Workflow/Tool`。

**Architecture:** 保留已验证的 Agent Runtime、Workflow Runtime、Knowledge Base、Tool Registry 和会话体系；删除没有真实业务调用的旧 memory/route 类型；迁移掉旧 chunk 级 knowledge API；把过薄的 Agent plan 文件合并，降低目录补丁感。数据库历史 migration 不做硬删，除非单独批准 migration squash。

**Tech Stack:** NestJS、Prisma、PostgreSQL/Neon、Vue2 admin、Node test、PowerShell。

---

## 0. 执行边界

本计划只围绕以下项目：

- 后端：`F:\公司项目\node-vue2-vue3\nestjs-prisma`
- 后台：`F:\公司项目\node-vue2-vue3\fullstack-admin-serve\vue-element-admin-dev`

默认不修改：

- 不删除已执行过的 Prisma migration 历史。
- 不改数据库结构。
- 不动 `skill-package`，除非用户明确确认不再需要“技能包/模板安装 Agent”能力。
- 不改小程序。
- 不改前端页面结构，只删除确认未被页面引用的旧 API 函数。

如果执行过程中发现数据库 schema 必须变更，立即停止，按项目数据库闭环规则重新确认目标库、migration、deploy、generate、status、读回验证。

---

## 1. 当前问题归类

### 1.1 重复或旧概念

| 类型 | 文件/模块 | 判断 | 原因 |
| --- | --- | --- | --- |
| 旧 memory | `src/ai-engine/memory/memory.service.ts` | 删除 | 只注册在 DI，没有业务调用；会话上下文已经由 `AiConversation/AiMessage` 提供。 |
| 旧 route/workflow 类型 | `src/ai-engine/core/types.ts` | 删除 | 当前正式 Workflow 类型在 `src/ai-engine/workflow/workflow.types.ts`，Agent 类型在 `src/ai-engine/agent/agent-runtime.types.ts`。 |
| 旧 Agent 状态接口 | `src/ai-engine/core/interfaces.ts` 中的 `MemoryService`、`ExtendedRouteResult`、`AgentState` | 删除 | 没有真实调用，名字会把人带回旧 Agent Router 思路。 |
| 旧 workflow registry | `AIRegistry.registerWorkflow/getWorkflow/listWorkflows` | 删除 | 当前工作流来自数据库 `AiWorkflow`，由 `WorkflowRuntimeService` 执行。 |
| 旧全局工具实例 | `toolExecutor` 常量 | 删除 | 当前真实调用是 DI 注入 `DefaultToolExecutor`。 |
| 旧 chunk 级知识 API | `src/modules/knowledge-bot/knowledge/**` | 删除 | 当前前端页面和 Agent 运行链路都走 `knowledge-base -> file -> chunk -> vector`。 |

### 1.2 可以合并的薄文件

| 当前文件 | 建议 | 原因 |
| --- | --- | --- |
| `agent-planner.service.ts` + `agent-plan-validator.service.ts` | 合并为 `agent-plan.service.ts` | 两个文件都很短，一个负责生成计划，一个负责校验计划，合在一起更顺。 |
| `agent-response-composer.service.ts` | 可合并进 `agent-executor.service.ts`，本轮建议先暂缓 | 它职责合理但文件较薄；直接合并会牵动 stream/non-stream 细节，建议在 planner/validator 合并后再做。 |
| `AiOrchestratorService` | 暂不删除，后续可改名为 `CompletionBuilderService` | 它不是旧 Agent Router，而是 LLM/RAG completion builder。改名能减少误解，但会牵动测试和导入。 |

### 1.3 不能删除

| 文件/模块 | 原因 |
| --- | --- |
| `src/ai-engine/agent/agent-runtime.service.ts` | 当前 Agent 主入口。 |
| `src/ai-engine/agent/agent-executor.service.ts` | 调度 workflow/tool/chat/knowledge 执行。 |
| `src/ai-engine/agent/agent-execution-logger.service.ts` | 写入 `AiAgentExecutionLog`，保留轻量运行日志。 |
| `src/ai-engine/orchestrator/ai-orchestrator.service.ts` | 仍被 AgentExecutor 使用，负责普通聊天和 RAG completion 构建。 |
| `src/ai-engine/knowledge-answer.util.ts` | ToB 知识答案数字/条件校验，必须保留。 |
| `src/ai-engine/llm/**`、`embedding/**`、`vector/**`、`safety/**`、`workflow/**`、`tools/**` | 当前底层能力和主链路依赖。 |
| `src/modules/knowledge-bot/knowledge-base/**` | 当前标准知识库体系。 |
| `src/modules/knowledge-bot/chat/**`、`conversation/**` | 用户聊天入口和会话落库。 |
| `src/modules/ai-platform/prompt/**`、`agent/**`、`tool/**`、`workflow/**`、`workflow-run/**` | AI 配置后台和运行记录。 |

---

## 2. 推荐最终结构

整理后的后端目录目标：

```text
src/ai-engine
├── agent
│   ├── agent-runtime.service.ts
│   ├── agent-runtime.types.ts
│   ├── agent-plan.service.ts
│   ├── agent-executor.service.ts
│   └── agent-execution-logger.service.ts
├── completion
│   └── completion-builder.service.ts
├── embedding
├── infra
├── knowledge-answer.util.ts
├── llm
├── safety
├── tools
│   ├── tool.executor.ts
│   └── tool.types.ts
├── vector
└── workflow
```

本次第一轮建议先做到：

```text
src/ai-engine
├── agent
│   ├── agent-runtime.service.ts
│   ├── agent-runtime.types.ts
│   ├── agent-plan.service.ts
│   ├── agent-executor.service.ts
│   ├── agent-response-composer.service.ts
│   └── agent-execution-logger.service.ts
├── core
│   └── ai.registry.ts
├── tools
│   ├── tool.executor.ts
│   └── tool.types.ts
...
```

说明：第一轮先不强行改名 `AiOrchestratorService`，避免一次改动过大。

---

## 3. Task 1：删除 memory 和旧 core 类型

**目标：** 删除没有业务链路调用的 memory，并把旧 route/state 概念移出 AIEngine。

**Files:**

- Delete: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\memory\memory.service.ts`
- Delete: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\core\types.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\ai-engine.module.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\core\interfaces.ts`

- [ ] **Step 1: 写删除前引用确认**

Run:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "InMemoryMemoryService|MemoryService|ExtendedRouteResult|AgentState|WorkflowContext|RouteResult|from './core/types'|from '../core/types'|from './memory/memory.service'" src test -S
```

Expected:

```text
只允许命中 ai-engine.module.ts、memory.service.ts、core/interfaces.ts、core/types.ts。
如果命中业务 service/controller，需要停止并重新分析。
```

- [ ] **Step 2: 修改 `ai-engine.module.ts`**

删除：

```ts
import { InMemoryMemoryService } from './memory/memory.service'
```

从 `providers` 删除：

```ts
InMemoryMemoryService,
```

从 `exports` 删除：

```ts
InMemoryMemoryService,
```

- [ ] **Step 3: 收窄 `core/interfaces.ts`**

把文件内容改成只保留工具接口：

```ts
export interface ToolExecutor {
  execute(toolName: string, params: any): Promise<any>
  listTools(): ToolDefinition[]
  registerTool(name: string, definition: ToolDefinition): void
}

export interface ToolDefinition {
  name: string
  description: string
  params: Record<string, any>
  handler: (params: any) => Promise<any>
}
```

- [ ] **Step 4: 删除文件**

删除：

```text
src/ai-engine/memory/memory.service.ts
src/ai-engine/core/types.ts
```

- [ ] **Step 5: 验证**

Run:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "InMemoryMemoryService|MemoryService|ExtendedRouteResult|AgentState|WorkflowContext|RouteResult" src test -S
npx.cmd tsc --noEmit
```

Expected:

```text
rg 不再命中旧 memory/route/state 类型。
TypeScript 编译通过。
```

---

## 4. Task 2：把 ToolDefinition 移到 tools，清理 AIRegistry 旧 workflow 注册能力

**目标：** `AIRegistry` 只做工具注册，不再保留旧 workflow registry。

**Files:**

- Create: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\tools\tool.types.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\core\ai.registry.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\tools\tool.executor.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge-bot\ai\tools\search-knowledge.tool.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge-bot\ai\tools\get-user-menu-permissions.tool.ts`
- Delete: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\core\interfaces.ts`

- [ ] **Step 1: 新建工具类型文件**

Create `src/ai-engine/tools/tool.types.ts`:

```ts
export interface ToolDefinition {
  name: string
  description: string
  params: Record<string, any>
  handler: (params: any) => Promise<any>
}

export interface ToolExecutor {
  execute(toolName: string, params: any): Promise<any>
  listTools(): ToolDefinition[]
  registerTool(name: string, definition: ToolDefinition): void
}
```

- [ ] **Step 2: 改 `AIRegistry`**

把 `src/ai-engine/core/ai.registry.ts` 改成只保留工具：

```ts
import { ToolDefinition } from '../tools/tool.types'

export class AIRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool)
  }

  registerTools(tools: ToolDefinition[]) {
    tools.forEach((tool) => this.registerTool(tool))
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }
}
```

- [ ] **Step 3: 改工具导入**

把这些文件中的：

```ts
import { ToolExecutor as IToolExecutor, ToolDefinition } from '../core/interfaces'
```

改为：

```ts
import { ToolExecutor as IToolExecutor, ToolDefinition } from './tool.types'
```

把 knowledge-bot 工具文件中的：

```ts
import { ToolDefinition } from '../../../../ai-engine/core/interfaces'
```

改为：

```ts
import { ToolDefinition } from '../../../../ai-engine/tools/tool.types'
```

- [ ] **Step 4: 删除 `core/interfaces.ts`**

删除：

```text
src/ai-engine/core/interfaces.ts
```

- [ ] **Step 5: 验证**

Run:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "core/interfaces|registerWorkflow|getWorkflow|listWorkflows|from './types'|from './core/types'|from '../core/types'" src test -S
npx.cmd tsc --noEmit
```

Expected:

```text
rg 不再命中旧 core interfaces/types 和 workflow registry 方法。
TypeScript 编译通过。
```

---

## 5. Task 3：合并 Agent Planner 和 Validator

**目标：** 减少 Agent runtime 目录薄文件，让计划生成和计划校验放在一个文件里。

**Files:**

- Create: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\agent\agent-plan.service.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\agent\agent-runtime.service.ts`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\ai-engine.module.ts`
- Delete: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\agent\agent-planner.service.ts`
- Delete: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-engine\agent\agent-plan-validator.service.ts`

- [ ] **Step 1: 新建 `agent-plan.service.ts`**

Create:

```ts
import { BadRequestException, Injectable } from '@nestjs/common'
import { AgentContext, AgentPlan, AgentPlanStep, AgentRuntimeInput } from './agent-runtime.types'

export const MAX_AGENT_PLAN_STEPS = 3

const AGENT_PLAN_STEP_TYPES = ['chat', 'knowledge', 'tool', 'workflow']

@Injectable()
export class AgentPlanService {
  createPlan(input: AgentRuntimeInput, context: AgentContext): AgentPlan {
    const step = this.createStep(input, context)
    return {
      goal: input.message,
      steps: [step].slice(0, MAX_AGENT_PLAN_STEPS),
    }
  }

  validate(plan: AgentPlan, context: AgentContext) {
    if (!plan.steps.length) {
      throw new BadRequestException('Agent plan cannot be empty')
    }
    if (plan.steps.length > context.maxSteps) {
      throw new BadRequestException(`Agent plan allows at most ${context.maxSteps} steps`)
    }
    plan.steps.forEach((step) => this.validateStep(step, context))
  }

  private createStep(input: AgentRuntimeInput, context: AgentContext): AgentPlanStep {
    const workflowCode = context.workflow?.code
    if (workflowCode) {
      return {
        type: 'workflow',
        action: 'execute',
        target: workflowCode,
        params: { message: input.message },
      }
    }

    if (input.requestedToolCode) {
      return {
        type: 'tool',
        action: 'execute',
        target: input.requestedToolCode,
        params: { message: input.message },
      }
    }

    if (context.knowledge.enabled && context.mode === 'knowledge') {
      return {
        type: 'knowledge',
        action: 'search',
        target: 'knowledge',
        params: { keyword: input.message },
      }
    }

    return {
      type: 'chat',
      action: 'reply',
      target: 'llm',
      params: { message: input.message },
    }
  }

  private validateStep(step: AgentPlanStep, context: AgentContext) {
    if (!AGENT_PLAN_STEP_TYPES.includes(step.type)) {
      throw new BadRequestException(`Unsupported Agent step type: ${step.type}`)
    }
    if (step.type === 'knowledge' && !context.knowledge.enabled) {
      throw new BadRequestException('Agent knowledge ability is not enabled')
    }
    if (step.type === 'knowledge' && !context.tools.includes('search_knowledge')) {
      throw new BadRequestException('Agent is not allowed to use knowledge search')
    }
    if (step.type === 'tool' && (!step.target || !context.tools.includes(step.target))) {
      throw new BadRequestException('Tool execution is not allowed')
    }
    if (step.type === 'workflow' && step.target !== context.workflow?.code) {
      throw new BadRequestException('Agent is not bound to this workflow')
    }
  }
}
```

- [ ] **Step 2: 改 `agent-runtime.service.ts`**

把导入：

```ts
import { AgentPlannerService, MAX_AGENT_PLAN_STEPS } from './agent-planner.service'
import { AgentPlanValidatorService } from './agent-plan-validator.service'
```

改成：

```ts
import { AgentPlanService, MAX_AGENT_PLAN_STEPS } from './agent-plan.service'
```

把构造函数：

```ts
private readonly planner: AgentPlannerService,
private readonly validator: AgentPlanValidatorService,
```

改成：

```ts
private readonly planService: AgentPlanService,
```

把调用：

```ts
const plan = this.planner.createPlan(input, context)
this.validator.validate(plan, context)
```

改成：

```ts
const plan = this.planService.createPlan(input, context)
this.planService.validate(plan, context)
```

- [ ] **Step 3: 改 `ai-engine.module.ts`**

删除：

```ts
import { AgentPlannerService } from './agent/agent-planner.service'
import { AgentPlanValidatorService } from './agent/agent-plan-validator.service'
```

新增：

```ts
import { AgentPlanService } from './agent/agent-plan.service'
```

从 providers/exports 删除：

```ts
AgentPlannerService,
AgentPlanValidatorService,
```

加入：

```ts
AgentPlanService,
```

- [ ] **Step 4: 删除旧文件**

删除：

```text
src/ai-engine/agent/agent-planner.service.ts
src/ai-engine/agent/agent-plan-validator.service.ts
```

- [ ] **Step 5: 验证**

Run:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "AgentPlannerService|AgentPlanValidatorService|agent-planner.service|agent-plan-validator.service" src test -S
npx.cmd tsc --noEmit
node --test test/ai-agent-runtime-clean-contract.test.cjs
```

Expected:

```text
rg 不再命中旧 planner/validator 类名和文件名。
TypeScript 编译通过。
Agent runtime clean contract 通过。
```

---

## 6. Task 4：删除 legacy knowledge 后端入口

**目标：** 后端只保留 `knowledge-base` 体系，删除旧 chunk 级 `knowledge` API。

**Files:**

- Delete: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge-bot\knowledge\**`
- Modify: `F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge-bot\knowledge-bot.module.ts`

- [ ] **Step 1: 确认旧 knowledge 只被 module 挂载**

Run:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "KnowledgeController|KnowledgeService|knowledge-bot/knowledge" src test -S
```

Expected:

```text
只允许命中 knowledge-bot.module.ts、knowledge.controller.ts、knowledge.service.ts 和测试中对旧接口的显式断言。
如果业务 service 仍注入 KnowledgeService，停止。
```

- [ ] **Step 2: 改 `knowledge-bot.module.ts`**

删除：

```ts
import { KnowledgeController } from './knowledge/knowledge.controller'
import { KnowledgeService } from './knowledge/knowledge.service'
```

把 controllers 从：

```ts
controllers: [ChatController, KnowledgeController, KnowledgeBaseController, ConversationController],
```

改为：

```ts
controllers: [ChatController, KnowledgeBaseController, ConversationController],
```

把 providers 从：

```ts
providers: [ChatService, KnowledgeService, KnowledgeBaseService, KnowledgeStorageService, ConversationService, SearchKnowledgeTool, GetUserMenuPermissionsTool],
```

改为：

```ts
providers: [ChatService, KnowledgeBaseService, KnowledgeStorageService, ConversationService, SearchKnowledgeTool, GetUserMenuPermissionsTool],
```

- [ ] **Step 3: 删除旧目录**

删除：

```text
src/modules/knowledge-bot/knowledge/knowledge.controller.ts
src/modules/knowledge-bot/knowledge/knowledge.service.ts
src/modules/knowledge-bot/knowledge/dto/create-knowledge.dto.ts
src/modules/knowledge-bot/knowledge/dto/delete-knowledge.dto.ts
src/modules/knowledge-bot/knowledge/dto/knowledge-list.dto.ts
src/modules/knowledge-bot/knowledge/dto/revector-knowledge.dto.ts
src/modules/knowledge-bot/knowledge/dto/search-knowledge.dto.ts
```

- [ ] **Step 4: 验证**

Run:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "KnowledgeController|KnowledgeService|knowledge-bot/knowledge" src test -S
npx.cmd tsc --noEmit
node --test test/ai-knowledge-base-contract.test.cjs
```

Expected:

```text
src 不再命中 legacy knowledge controller/service/API 路径。
knowledge-base contract 仍通过。
TypeScript 编译通过。
```

---

## 7. Task 5：删除 Vue2 旧 knowledge API 函数

**目标：** 前端 API 文件不再暴露未使用的旧 chunk 级 knowledge 方法。

**Files:**

- Modify: `F:\公司项目\node-vue2-vue3\fullstack-admin-serve\vue-element-admin-dev\src\api\ai.js`

- [ ] **Step 1: 确认旧 API 函数未被页面引用**

Run from Vue2 project:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "getKnowledgeList|createKnowledge|uploadKnowledge|deleteKnowledge|revectorKnowledge|searchKnowledge\\(" src -S
```

Expected:

```text
只命中 src/api/ai.js 中旧函数定义。
knowledge-base 相关函数和页面引用要保留。
```

- [ ] **Step 2: 删除 `src/api/ai.js` 旧函数**

删除这一组函数：

```js
export const getKnowledgeList = params => {
  return request.get(`${baseApi}/knowledge-bot/knowledge/list`, params);
};

export const createKnowledge = data => {
  return request.post(`${baseApi}/knowledge-bot/knowledge`, data);
};

export const uploadKnowledge = data => {
  return request.post(`${baseApi}/knowledge-bot/knowledge/upload`, data, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

export const deleteKnowledge = data => {
  return request.post(`${baseApi}/knowledge-bot/knowledge/delete`, data);
};

export const revectorKnowledge = data => {
  return request.post(`${baseApi}/knowledge-bot/knowledge/revector`, data);
};

export const searchKnowledge = params => {
  return request.get(`${baseApi}/knowledge-bot/knowledge/search`, params);
};
```

- [ ] **Step 3: 验证**

Run from Vue2 project:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "knowledge-bot/knowledge(?!-base)|getKnowledgeList|createKnowledge|uploadKnowledge|deleteKnowledge|revectorKnowledge|searchKnowledge\\(" src -S
npm.cmd run lint
```

Expected:

```text
不再命中旧 knowledge API。
lint 通过，或只出现项目既有无关 lint 问题时停止并记录。
```

PowerShell 的 ripgrep 不一定支持负向前瞻时，可改用：

```powershell
rg -n "knowledge-bot/knowledge|getKnowledgeList|createKnowledge|uploadKnowledge|deleteKnowledge|revectorKnowledge|searchKnowledge\\(" src -S
```

然后人工确认命中的 `knowledge-bot/knowledge-base` 属于保留项。

---

## 8. Task 6：测试合同同步

**目标：** 删除旧文件后，测试不再断言已经删除的旧结构。

**Files:**

- Modify only if failing: `F:\公司项目\node-vue2-vue3\nestjs-prisma\test\*.cjs`

- [ ] **Step 1: 运行 AI 相关合同测试**

Run:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
node --test test/ai-agent-runtime-clean-contract.test.cjs
node --test test/ai-agent-knowledge-scope-contract.test.cjs
node --test test/ai-agent-prompt-policy-contract.test.cjs
node --test test/ai-knowledge-base-contract.test.cjs
node --test test/ai-rag-answer-sanitize-contract.test.cjs
node --test test/ai-workflow-tool-contract.test.cjs
node --test test/ai-workflow-knowledge-answer-contract.test.cjs
```

Expected:

```text
全部通过。
```

- [ ] **Step 2: 如果测试仍断言旧文件存在，只改测试意图**

允许把旧断言改成新断言，例如：

```js
assert(!fs.existsSync(path.join(rootDir, 'src/modules/knowledge-bot/knowledge/knowledge.controller.ts')))
assert(module.includes('KnowledgeBaseController'))
assert(!module.includes('KnowledgeController'))
```

禁止为了让测试通过恢复旧代码。

- [ ] **Step 3: 全量 TypeScript 验证**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected:

```text
TypeScript 编译通过。
```

---

## 9. Task 7：暂缓项，只做记录不执行

这些不要在第一轮清理里做：

### 9.1 `AiOrchestratorService` 改名

建议未来改成：

```text
src/ai-engine/completion/completion-builder.service.ts
```

原因：

- 当前名字像旧编排器，但真实职责是构建普通聊天/RAG completion。
- 它仍被 AgentExecutor 和测试依赖，第一轮不动更稳。

执行前必须先改测试路径和导入。

### 9.2 合并 `agent-response-composer.service.ts`

可以未来合并进 `agent-executor.service.ts`，但第一轮先不做。

原因：

- 它虽薄，但职责是“执行结果 -> 最终自然语言回答”。
- 直接合并会牵动 stream/non-stream 两条路径。

### 9.3 删除 `skill-package`

不在技术清理中执行。

只有用户明确确认不需要“技能包/模板安装 Agent”能力时，才做独立删除计划。删除会涉及：

```text
prisma/schema.prisma
prisma/migrations/*
prisma/seeds/menu.ts
prisma/seeds/permission.ts
src/modules/ai-platform/skill-package/**
src/modules/ai-platform/ai-platform.module.ts
fullstack-admin-serve/vue-element-admin-dev/src/api/ai.js
fullstack-admin-serve/vue-element-admin-dev/src/views/AIEngine/skillPackage/**
test/*skill-package*.cjs
```

这属于数据库结构和菜单权限闭环，不能混进本轮源码精简。

### 9.4 删除历史 migration

不要直接删除：

```text
prisma/migrations/20260803010000_add_ai_agent_capability_trace
prisma/migrations/20260803020000_add_ai_agent_route_evaluation_feedback
prisma/migrations/20260803073000_rollback_ai_agent_route_trace_patch
prisma/migrations/20260803080000_add_ai_agent_execution_log
```

原因：

- 如果这些 migration 已经在 Neon 执行，本地删除会导致 Prisma migration 历史不一致。
- 想整理 migration 历史，必须单独做 migration squash/重建库方案。

---

## 10. 最终验收

从后端项目执行：

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "InMemoryMemoryService|MemoryService|ExtendedRouteResult|AgentState|WorkflowContext|RouteResult|registerWorkflow|getWorkflow|listWorkflows|KnowledgeController|KnowledgeService|knowledge-bot/knowledge" src test -S
npx.cmd tsc --noEmit
node --test test/ai-agent-runtime-clean-contract.test.cjs
node --test test/ai-knowledge-base-contract.test.cjs
node --test test/ai-rag-answer-sanitize-contract.test.cjs
```

从 Vue2 后台项目执行：

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
rg -n "getKnowledgeList|createKnowledge|uploadKnowledge|deleteKnowledge|revectorKnowledge|searchKnowledge\\(" src -S
npm.cmd run lint
```

最终状态应满足：

- `memory/**` 删除。
- `core/types.ts` 删除。
- `core/interfaces.ts` 删除，工具类型迁移到 `tools/tool.types.ts`。
- `AIRegistry` 只保留 tool registry。
- `agent-planner.service.ts` 和 `agent-plan-validator.service.ts` 合并为 `agent-plan.service.ts`。
- legacy `knowledge/**` 删除。
- Vue2 旧 knowledge API 函数删除。
- `knowledge-base/**`、Agent Runtime、Workflow Runtime、RAG 校验、会话保存仍正常。

---

## 11. 下个对话可直接使用的指令

```text
按 nestjs-prisma/doc/code/AIEngine/ai-module-cleanup-implementation-plan.md 执行 Task 1-6。
目标是精简 AI 模块：删除 memory、旧 core route/type、旧 workflow registry、旧全局 toolExecutor、legacy knowledge 后端入口和 Vue2 旧 knowledge API，并合并 Agent planner/validator。
不改数据库结构，不删除历史 migration，不删除 skill-package，不改 AiOrchestratorService 名称，不合并 agent-response-composer。
每个 Task 后运行文档里的验证命令；如果发现数据库变更需求或旧接口仍被真实页面调用，立即停下汇报。
完成 Task 6 后停下汇报，不开始 Task 7 暂缓项。
```

