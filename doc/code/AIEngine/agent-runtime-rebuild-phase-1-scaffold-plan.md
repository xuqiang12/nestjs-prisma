# 智能体平台重构阶段 1：目录骨架计划

## 阶段目标

本阶段只新建后续迁移需要的目录骨架，不迁移业务代码，不调整 Controller 路由，不修改数据库，不删除原有文件。

原有目录和文件必须全部保留，后续阶段完成迁移和验收后再同步删除。

## 前提假设

1. 本阶段是低风险准备阶段，只为后续迁移建立明确落点。
2. 空目录无法被 Git 稳定跟踪，若执行时需要提交空目录，应使用 `.gitkeep` 或最小标记文件。
3. 不注册新模块，不改变 `src/app.module.ts` 的运行行为。

## 目录范围

### 新增业务入口目录

```text
src/modules/ai-chat/
src/modules/ai-chat/dto/

src/modules/agent-chat/
src/modules/agent-chat/chat/
src/modules/agent-chat/chat/dto/
src/modules/agent-chat/conversation/
src/modules/agent-chat/conversation/dto/
```

### 新增配置和资源目录

```text
src/modules/ai-admin/
src/modules/ai-admin/model-provider/
src/modules/ai-admin/model-config/
src/modules/ai-admin/prompt/
src/modules/ai-admin/sensitive-word/
src/modules/ai-admin/agent/

src/modules/knowledge/
src/modules/knowledge/knowledge-base/
src/modules/knowledge/knowledge-base/dto/
```

### 新增运行时内部目录

```text
src/ai-engine/agent/context/
src/ai-engine/agent/router/
src/ai-engine/agent/validator/
src/ai-engine/agent/executor/
src/ai-engine/agent/composer/
src/ai-engine/agent/trace/

src/ai-engine/rag/
src/ai-engine/tool/
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
