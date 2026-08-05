# 智能体平台重构阶段 3：智能体配置和运行链路迁移计划

## 阶段目标

本阶段迁移智能体新增、修改、配置读取和智能体对话运行链路。

迁移完成并验证通过后，同步删除对应旧目录中的已迁移代码。

## 前提假设

1. 阶段 1 和阶段 2 已完成。
2. 基础配置、知识库管理、提示词管理、敏感词管理已经在新目录中稳定运行。
3. 本阶段开始处理运行时行为变化，所有破坏性变更必须在实施前单独确认。

## 迁移范围

### 智能体配置管理

```text
src/modules/ai-platform/agent
-> src/modules/ai-admin/agent
```

接口路径建议先保持：

```text
/ai-platform/agent/*
```

本阶段负责：

```text
智能体新增
智能体修改
智能体启停
智能体详情
智能体启用选项
智能体配置选项
promptId / modelConfigId / knowledgeBaseIds / workflowCode / toolCodes 校验
```

### 智能体对话入口

```text
src/modules/knowledge-bot/chat
-> src/modules/agent-chat/chat

src/modules/knowledge-bot/conversation
-> src/modules/agent-chat/conversation
```

接口路径保持：

```text
/agent/chat
/agent/chat/stream
/agent/conversation/*
```

### 智能体运行时内部

```text
src/ai-engine/agent/agent-plan.service.ts
-> src/ai-engine/agent/router/agent-router.service.ts
-> src/ai-engine/agent/validator/agent-validator.service.ts

src/ai-engine/agent/agent-executor.service.ts
-> src/ai-engine/agent/executor/agent-executor.service.ts

src/ai-engine/agent/agent-response-composer.service.ts
-> src/ai-engine/agent/composer/agent-composer.service.ts

src/ai-engine/agent/agent-execution-logger.service.ts
-> src/ai-engine/agent/trace/agent-trace.service.ts
```

运行时目标链路：

```text
modules/agent-chat
-> 输入敏感词检查
-> 获取或创建 Agent 会话
-> 读取历史消息
-> ai-engine/agent/AgentRuntimeService
-> AgentContextBuilder
-> AgentRouter
-> AgentValidator
-> AgentExecutor
-> AgentComposer
-> AgentTrace
-> 输出敏感词检查
-> 保存安全后的 assistant message
-> 返回
```

## 需要单独确认的破坏性变更

### agentCode 必传

当前 `/agent/chat` 仍支持不传 `agentCode` 后走默认对话。若本阶段改为智能体对话必须传 `agentCode`，需要同时确认：

```text
/agent/chat 不再承担普通 AI 对话
/ai/chat 承担普通 AI 对话
Vue2 聊天页发送智能体对话时必须带 agentCode
旧的 resolveDefault 默认智能体路径不再用于 /agent/chat
```

### 会话数据库模型

若本阶段新增或确认以下字段：

```text
AiConversation.type = CHAT | AGENT
AiConversation.agentId nullable
AiAgentExecutionLog 补 requestId / capability / toolCode / workflowCode / knowledgeBaseIds / error
```

必须执行数据库闭环：

```text
确认目标数据库来源
生成 Prisma migration
npm.cmd run migrate:deploy
npm.cmd run prisma:generate
npm.cmd run migrate:status
查询关键字段确认
```

## 本阶段不做

```text
不实现 LLM 自由规划
不实现多步自主循环
不新增 Memory
不新增 Evaluation
不新增 AiTrace 表
不把 SkillPackage 当成 runtime 可执行节点
不迁移 workflow 管理页面
不迁移 tool 管理页面
不迁移 skill-package 管理页面
不改 /ai-platform/* 外部路径
```

## 执行步骤

1. 补充智能体配置迁移合同测试。
2. 迁移 `ai-platform/agent` 到 `ai-admin/agent`，保持接口路径。
3. 验证智能体新增、修改、启停、详情、选项接口。
4. 补充智能体聊天和会话合同测试。
5. 迁移 `/agent/chat` 和 `/agent/conversation/*` 到 `modules/agent-chat`。
6. 拆分 `AgentContextBuilder`、`AgentRouter`、`AgentValidator`、`AgentExecutor`、`AgentComposer`、`AgentTrace`。
7. 验证非流式和流式智能体对话。
8. 若启用数据库模型变更，完成 Prisma 和目标数据库闭环。
9. 验证通过后删除旧智能体配置和旧聊天会话代码。

## 验收计划

### 智能体配置验收

建议命令：

```powershell
cd F:\公司项目\node-vue2-vue3\nestjs-prisma
node --test test/ai-agent-code-generation-contract.test.cjs
node --test test/ai-agent-prompt-policy-contract.test.cjs
node --test test/ai-agent-workflow-dependency-contract.test.cjs
node --test test/ai-agent-knowledge-base-binding-contract.test.cjs
node --test test/ai-agent-knowledge-scope-contract.test.cjs
npx.cmd tsc --noEmit
git diff --check
```

### 智能体运行链路验收

建议命令：

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

### 数据库验收

只有本阶段实际修改 Prisma schema 时执行：

```powershell
cd F:\公司项目\node-vue2-vue3\nestjs-prisma
npm.cmd run migrate:deploy
npm.cmd run prisma:generate
npm.cmd run migrate:status
```

同时必须用查询、接口或测试确认运行所需字段已经存在。

### 删除验收

迁移通过后允许删除：

```text
src/modules/ai-platform/agent
src/modules/knowledge-bot/chat
src/modules/knowledge-bot/conversation
src/ai-engine/agent/agent-plan.service.ts
src/ai-engine/agent/agent-executor.service.ts
src/ai-engine/agent/agent-response-composer.service.ts
src/ai-engine/agent/agent-execution-logger.service.ts
```

删除前必须确认：

```text
新目录已注册到 Nest 模块
旧目录无剩余 import
/agent/chat 非流式可用
/agent/chat/stream 流式可用
/agent/conversation/* 可用
输出敏感词检查发生在 assistant message 保存前
```

### 通过标准

```text
智能体配置 CRUD 迁移完成
智能体运行链路迁移完成
旧智能体相关目录引用清零
已迁移旧代码同步删除
数据库状态按是否变更明确闭环
```
