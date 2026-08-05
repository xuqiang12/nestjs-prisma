# 智能体平台重构阶段 2：基础配置和知识库管理迁移计划

## 阶段目标

本阶段迁移基础增删改查模块：模型管理、知识库管理、提示词管理、敏感词管理。

迁移完成并验证通过后，同步删除对应旧目录中的已迁移代码。

## 前提假设

1. 阶段 1 的目录骨架已经存在。
2. 本阶段只迁移基础配置和知识库管理，不迁移智能体新增修改，不迁移智能体对话运行链路。
3. 对外接口路径保持不变，避免前端同步大改。

## 迁移范围

### 模型管理

```text
src/modules/ai-platform/model-provider
-> src/modules/ai-admin/model-provider

src/modules/ai-platform/model-config
-> src/modules/ai-admin/model-config
```

接口路径保持：

```text
/ai-platform/model-provider/*
/ai-platform/model/*
```

### 提示词管理

```text
src/modules/ai-platform/prompt
-> src/modules/ai-admin/prompt
```

接口路径保持：

```text
/ai-platform/prompt/*
```

### 敏感词管理

```text
src/modules/ai-platform/sensitive-word
-> src/modules/ai-admin/sensitive-word
```

接口路径保持：

```text
/ai-platform/sensitive-word/*
```

### 知识库管理

```text
src/modules/knowledge-bot/knowledge-base
-> src/modules/knowledge/knowledge-base
```

接口路径保持：

```text
/knowledge-bot/knowledge-base/*
```

## 本阶段不做

```text
不迁移 src/modules/ai-platform/agent
不迁移 src/modules/knowledge-bot/chat
不迁移 src/modules/knowledge-bot/conversation
不重构 AgentRuntimeService
不创建 /ai-admin/* 新接口路径
不创建 /knowledge/* 新接口路径
不修改 Prisma schema
不执行数据库 migration
不新增 RAG 能力
```

## 执行步骤

1. 为模型、提示词、敏感词、知识库管理补充迁移合同测试。
2. 将基础配置服务、Controller、DTO 移动到新目录。
3. 调整 `AiPlatformModule` 或新增 `AiAdminModule` 的注册关系，保持原接口路径不变。
4. 将知识库管理移动到 `modules/knowledge/knowledge-base`，保持 `/knowledge-bot/knowledge-base/*` 路径不变。
5. 验证后删除已迁移旧目录代码。
6. 扫描旧路径引用，确保没有业务代码继续依赖旧目录。

## 验收计划

### 接口合同验收

检查项：

```text
/ai-platform/model-provider/* 路径不变
/ai-platform/model/* 路径不变
/ai-platform/prompt/* 路径不变
/ai-platform/sensitive-word/* 路径不变
/knowledge-bot/knowledge-base/* 路径不变
Vue2 src/api/ai.js 无需改路径
```

建议命令：

```powershell
cd F:\公司项目\node-vue2-vue3\nestjs-prisma
node --test test/ai-model-center-api-contract.test.cjs
node --test test/ai-model-center-runtime-contract.test.cjs
node --test test/ai-prompt-id-contract.test.cjs
node --test test/ai-llm-output-guard-contract.test.cjs
node --test test/ai-knowledge-base-contract.test.cjs
npx.cmd tsc --noEmit
git diff --check
```

### 删除验收

迁移通过后允许删除：

```text
src/modules/ai-platform/model-provider
src/modules/ai-platform/model-config
src/modules/ai-platform/prompt
src/modules/ai-platform/sensitive-word
src/modules/knowledge-bot/knowledge-base
```

删除前必须确认：

```text
新目录已注册到 Nest 模块
Swagger 模块分组仍能加载
旧目录无剩余 import
相关合同测试和 TypeScript 编译通过
```

### 通过标准

```text
基础 CRUD 路径保持兼容
前端调用路径不变
旧目录引用清零
已迁移旧代码同步删除
无数据库变更
```
