# 智能体平台重构阶段 1：目录骨架计划

## 阶段目标

本阶段只新建后续迁移需要的目录骨架，不迁移业务代码，不调整 Controller 路由，不修改数据库，不删除原有文件。

原有目录和文件必须全部保留，后续阶段完成迁移和验收后再同步删除。

## 前提假设

1. 本阶段是低风险准备阶段，只为后续迁移建立明确落点。
2. 空目录无法被 Git 稳定跟踪，若执行时需要提交空目录，应使用 `.gitkeep` 或最小标记文件。
3. 不注册新模块，不改变 `src/app.module.ts` 的运行行为。

## 目录范围

本阶段先建立以下 5 个后续重构的大目录边界：

```text
src/modules/chat/          普通对话入口
src/modules/agent-chat/    Agent 对话和会话入口
src/modules/ai-config/     AI 基础配置中心
src/modules/knowledge/     知识资产管理
src/ai-runtime/            AI 内部运行时能力层
```

### 新增业务入口目录

```text
src/modules/chat/
src/modules/chat/dto/

src/modules/agent-chat/
src/modules/agent-chat/chat/
src/modules/agent-chat/chat/dto/
src/modules/agent-chat/conversation/
src/modules/agent-chat/conversation/dto/
```

### 新增配置和资源目录

```text
src/modules/ai-config/
src/modules/ai-config/model-provider/
src/modules/ai-config/model-config/
src/modules/ai-config/prompt/
src/modules/ai-config/sensitive-word/
src/modules/ai-config/agent/

src/modules/knowledge/
src/modules/knowledge/knowledge-base/
src/modules/knowledge/knowledge-base/dto/
```

`src/modules/ai-config/` 负责模型供应商、模型配置、提示词、敏感词、Agent 管理等 AI 基础配置。

`src/modules/knowledge/` 负责知识库、文件、切片、向量重建、检索测试等知识资产管理。AI 配置中只保存 Agent 对知识库的引用关系，不管理知识库本体。

### 新增运行时内部目录

```text
src/ai-runtime/agent/context/
src/ai-runtime/agent/router/
src/ai-runtime/agent/validator/
src/ai-runtime/agent/executor/
src/ai-runtime/agent/composer/
src/ai-runtime/agent/trace/

src/ai-runtime/rag/
src/ai-runtime/tool/
```

## 本阶段不做

```text
不移动 src/modules/knowledge-bot/chat
不移动 src/modules/knowledge-bot/conversation
不移动 src/modules/ai-platform
不移动 src/modules/knowledge-bot/knowledge-base
不移动 src/ai-engine/knowledge-qa
不移动 src/ai-engine/tools
不修改 Controller 路径
不修改 Prisma schema
不执行数据库 migration
不删除旧代码
```

## 执行步骤

1. 新增目录骨架。
2. 如目录为空，加入 `.gitkeep`，内容保持为空。
3. 新增或更新架构合同测试，验证新目录存在、旧目录仍存在。
4. 运行静态验证，确认本阶段没有业务行为变化。

## 验收计划

### 结构验收

检查项：

```text
新目录存在
旧目录仍存在
KnowledgeBotModule 仍保留原 Controller 注册
AppModule 不新增未接线模块
没有新增 migration
没有删除任何旧业务文件
```

建议命令：

```powershell
cd F:\公司项目\node-vue2-vue3\nestjs-prisma
node --test test/ai-agent-platform-architecture-contract.test.cjs
npx.cmd tsc --noEmit
git diff --check
```

### 通过标准

```text
目录合同测试通过
TypeScript 编译通过
diff 无空白错误
运行路由不发生变化
数据库未发生变化
```

### 删除规则

本阶段禁止删除旧代码。旧代码只能在后续迁移阶段完成验证后删除。
