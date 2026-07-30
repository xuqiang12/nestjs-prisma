# AI 知识库高级管理设计

## 背景

当前项目的知识库能力以 `documents` 向量分片表为核心：新增文本或上传文件后，后端直接切分文本、生成 embedding，并把每个分片写入 `documents`。前端 `AIEngine/knowledge/index.vue` 展示的也是分片级列表，支持新增、上传、删除分片、重新向量化和相似检索。

这套实现可以支撑基础 RAG，但缺少“知识库配置”和“源文件管理”两层，因此无法自然支持以下能力：

- 创建一条知识库配置记录，并查看、编辑、禁用、删除。
- 按知识库管理源文件。
- 保存源文件并支持下载。
- 替换源文件后重建分片。
- 查看、编辑、删除单个分片。
- 对单个文件或整个知识库重新分片。
- 在指定知识库范围内做检索测试。

## 目标

把当前“分片管理页”升级为“知识库配置 + 文档管理 + 分片管理 + 检索测试”的完整闭环。

第一版目标是跑通本项目已有 embedding/RAG 主线，不做多供应商动态适配的完整抽象。知识库配置表会保存模型供应商、服务地址、模型名、向量维度等字段，但运行时优先复用当前后端已经可用的 `EmbeddingService` 和 `VectorStoreService`。

## 前提假设

- 源文件保存到本地文件目录，不保存到数据库。
- 源文件目录放在后端项目内的运行时目录，例如 `uploads/knowledge`。
- 数据库保存文件相对路径、原始文件名、大小、MIME 类型和处理状态。
- 读写接口继续遵守当前项目约定：查询使用 `GET`，新增、修改、删除、状态变更、重新分片等写操作使用 `POST`。
- 这次设计覆盖 `nestjs-prisma` 后端和 Vue2 后台管理系统，不涉及 uni-app 小程序。
- 实现时会涉及 Prisma schema、migration 和目标 Neon 数据库更新，必须按项目数据库闭环规则执行。

## 非目标

- 不在第一版实现后台异步队列和任务中心。
- 不在第一版接入对象存储、云盘或第三方文件系统。
- 不在第一版实现 PDF、Word 的高级版式解析；可以先沿用当前文本读取能力，后续再补解析器。
- 不把 API Key 明文展示在列表页；编辑页可以提供脱敏展示和重新录入。
- 不重做当前 chat、workflow、agent 主线，只把知识检索范围接入到这些主线。

## 数据模型设计

### AiKnowledgeBase

知识库配置主表，一条记录对应一个可管理的知识库。

建议字段：

- `id`：Snowflake 字符串主键。
- `code`：知识库编码，唯一，创建后不允许修改。
- `name`：知识库名称。
- `description`：描述。
- `ragMode`：RAG 模式，第一版可固定支持 `generic`。
- `provider`：embedding 模型供应商，例如 `current`、`bailian`、`ollama`。
- `apiKeyEncrypted`：API Key 加密或脱敏保存字段。第一版如果继续使用全局 `.env`，可为空。
- `endpoint`：embedding 服务地址。
- `embeddingModel`：embedding 模型名。
- `embeddingDimension`：向量维度，创建后如已有分片则不允许修改。
- `responseBufferMb`：响应缓冲大小。
- `batchSize`：单批次最大文本数。
- `status`：状态，`1` 启用，`0` 禁用。
- `createdAt`、`updatedAt`：审计字段。

### AiKnowledgeBaseAgent

知识库与智能体关联表，用于支持截图中的“关联智能体”。

建议字段：

- `id`：Snowflake 字符串主键。
- `knowledgeBaseId`：知识库 ID。
- `agentId`：智能体 ID。
- `createdAt`：创建时间。

约束：

- `knowledgeBaseId + agentId` 唯一。
- 删除知识库时级联删除关联记录。
- 删除智能体时级联删除关联记录或先解除关联，具体以 Prisma 关系风险为准。

### AiKnowledgeFile

知识库源文件表，一条记录对应一个上传文件。

建议字段：

- `id`：Snowflake 字符串主键。
- `knowledgeBaseId`：所属知识库 ID。
- `originalName`：原始文件名。
- `storagePath`：源文件相对路径，例如 `uploads/knowledge/manual/<fileId>/使用手册.md`。
- `mimeType`：文件 MIME 类型。
- `size`：文件字节数。
- `checksum`：文件摘要，用于替换和重复上传判断。
- `chunkCount`：当前分片数。
- `status`：处理状态，`pending`、`processing`、`completed`、`failed`。
- `errorMessage`：失败原因。
- `createdAt`、`updatedAt`：审计字段。

### documents 扩展

继续使用现有 `documents` 表作为向量分片表，避免重写当前 RAG 主线。

建议新增字段：

- `knowledgeBaseId`：所属知识库 ID。
- `fileId`：所属文件 ID，可为空。手动新增知识时没有源文件。
- `chunkIndex`：分片序号。
- `tokenCount`：估算 token 数或字符数。
- `charStart`、`charEnd`：原文字符范围。
- `status`：分片状态，`1` 启用，`0` 禁用。
- `updatedAt`：更新时间。

保留字段：

- `content`：分片内容。
- `metadata`：扩展元数据。
- `embedding`：pgvector 向量。
- `createdAt`：创建时间。

## 本地文件目录设计

源文件统一放在后端运行时目录：

```text
uploads/
  knowledge/
    <knowledgeBaseCode>/
      <fileId>/
        <originalName>
```

数据库只保存相对路径，接口下载时通过后端读取文件并返回。

实现要求：

- 上传前校验知识库存在且启用。
- 保存文件名时保留原始名称用于展示，实际路径用 `fileId` 分目录避免重名冲突。
- 删除文件时先删除数据库分片和文件记录，再删除本地文件；如果本地文件已不存在，不影响数据库删除结果。
- 替换文件时上传新文件，删除旧分片，重建新分片；旧源文件删除失败时记录日志，不阻断新文件生效。
- `uploads/knowledge` 应加入 `.gitignore`，避免源文件进入 Git。

## 后端接口设计

### 知识库配置

- `GET /knowledge-bot/knowledge-base/list`：知识库列表。
- `GET /knowledge-bot/knowledge-base/detail`：知识库详情。
- `POST /knowledge-bot/knowledge-base`：创建知识库。
- `POST /knowledge-bot/knowledge-base/update`：编辑知识库。
- `POST /knowledge-bot/knowledge-base/status`：启用或禁用知识库。
- `POST /knowledge-bot/knowledge-base/delete`：删除知识库及其文件、分片和关联记录。

### 文件管理

- `GET /knowledge-bot/knowledge-base/file/list`：查询知识库文件列表。
- `POST /knowledge-bot/knowledge-base/file/upload`：上传文件并生成分片。
- `GET /knowledge-bot/knowledge-base/file/download`：下载源文件。
- `POST /knowledge-bot/knowledge-base/file/replace`：重新上传并替换源文件。
- `POST /knowledge-bot/knowledge-base/file/rechunk`：单个文件重新分片。
- `POST /knowledge-bot/knowledge-base/file/delete`：删除文件及其分片。
- `POST /knowledge-bot/knowledge-base/file/rechunk-all`：当前知识库全部重新分片。

### 分片管理

- `GET /knowledge-bot/knowledge-base/chunk/list`：按文件查看分片。
- `GET /knowledge-bot/knowledge-base/chunk/detail`：查看单个分片详情。
- `POST /knowledge-bot/knowledge-base/chunk/update`：编辑分片内容并重新生成该分片向量。
- `POST /knowledge-bot/knowledge-base/chunk/delete`：删除单个分片。

### 检索测试

- `GET /knowledge-bot/knowledge-base/search-test`：按知识库范围检索，返回命中的分片、距离、文件名、分片序号。

## 后端服务边界

建议在 `src/modules/knowledge-bot/knowledge` 下继续演进，避免新增平行 AI 路径。

建议拆分服务：

- `KnowledgeBaseService`：知识库配置 CRUD、状态、删除。
- `KnowledgeFileService`：源文件保存、下载、替换、文件级重建。
- `KnowledgeChunkService`：分片查询、编辑、删除。
- `KnowledgeSearchService`：检索测试和 RAG 查询入口适配。
- `KnowledgeStorageService`：本地文件路径、写入、读取、删除。

`VectorStoreService` 继续负责 embedding 入库和相似检索，但要新增按 `knowledgeBaseId`、`fileId` 过滤的能力。

## 前端页面设计

### 知识库首页

路径仍可沿用当前菜单 `/AIEngine/knowledge/index`。

页面形态改为知识库列表或卡片：

- 展示名称、描述、状态、文件数、分片数、更新时间。
- 操作按钮：查看、编辑、禁用或启用、文档、删除。
- 顶部按钮：新增知识库。

新增和编辑弹窗字段：

- 关联智能体。
- RAG 模式。
- 名称。
- 编码。
- 描述。
- 连接配置：供应商、API Key、服务地址、embedding 模型、向量维度、响应缓冲、批量大小。

### 文档管理页

进入某个知识库后展示文档管理。

左侧：

- 文档分块。
- 检索测试。

文档分块页：

- 上传文档。
- 刷新。
- 全部重新分片。
- 文件搜索。
- 表格列：文件名、大小、分块数、状态、操作。
- 操作按钮：查看分片、下载源文件、重新上传、重新分片、删除文件及分片。

分片详情抽屉：

- 展示分片序号、token 或字符数、字符范围、内容。
- 支持复制、编辑、删除。
- 编辑保存后重新生成该分片向量。

检索测试页：

- 输入检索问题。
- 选择返回数量。
- 只在当前知识库范围内检索。
- 展示命中文件、分片序号、距离、分片内容。

## RAG 运行时接入

当前智能体已经有知识库相关配置。升级后建议把实际检索范围从 `metadata.tags` 逐步迁移为 `knowledgeBaseId`：

- 智能体关联知识库后，聊天时根据 `agentCode` 找到启用的知识库 ID 列表。
- `VectorStoreService.similaritySearch` 支持 `knowledgeBaseIds` 过滤。
- 兼容期可以保留 `knowledgeTags`，但新页面优先使用知识库关联关系。
- 禁用知识库后，不再参与聊天 RAG 和检索测试。

## 删除规则

删除知识库：

1. 删除知识库与智能体关联。
2. 删除该知识库下所有分片。
3. 删除该知识库下所有文件记录。
4. 删除本地文件目录。
5. 删除知识库记录。

删除文件：

1. 删除该文件下所有分片。
2. 删除文件记录。
3. 删除本地源文件目录。

删除分片：

1. 只删除当前分片。
2. 更新文件 `chunkCount`。
3. 不删除源文件。

## 迁移与数据库闭环

实现阶段涉及 Prisma schema 和 migration，必须完成以下验证：

1. 确认目标数据库来源：读取当前 `.env` 中 `NEON_DATABASE_URL` 和 `NEON_DIRECT_URL`，输出时只展示脱敏 host 和 database。
2. 新增 Prisma migration。
3. 执行 `npm.cmd run migrate:deploy` 更新目标数据库。
4. 执行 `npm.cmd run prisma:generate`。
5. 执行 `npm.cmd run migrate:status`。
6. 查询关键表和字段，确认 `AiKnowledgeBase`、`AiKnowledgeFile`、`documents` 新字段已存在。
7. 上传一个测试文件，确认本地文件存在、文件记录存在、分片记录存在。
8. 删除测试知识库，确认数据库记录和本地文件均被清理。

最终交付说明必须区分：

- 源码和迁移文件是否已改。
- Prisma Client 是否已生成。
- 目标数据库是否已更新并校验。
- 本地文件上传、下载、替换、删除是否已验证。

## 分阶段实施建议

### 第一阶段：后端数据层和基础接口

- 增加知识库、知识库文件、智能体知识库关联模型。
- 扩展 `documents`。
- 实现知识库 CRUD、状态、删除。
- 实现文件上传、下载、删除。
- 实现按知识库和文件生成分片。
- 保持当前旧接口可用，避免聊天页立即断裂。

验收标准：

- 能创建知识库。
- 能上传文件并保存到本地目录。
- 能生成分片并关联到知识库和文件。
- 能下载源文件。
- 能删除知识库并清理文件和分片。

### 第二阶段：前端知识库首页和文档页

- 把当前知识分片表格改为知识库列表。
- 新增知识库配置弹窗。
- 新增文档管理视图。
- 增加文件操作按钮。
- 增加分片详情抽屉。

验收标准：

- 前端能完成知识库新增、查看、编辑、禁用、删除。
- 前端能进入文档页并上传文件。
- 前端能查看文件分片、下载源文件、删除文件及分片。

### 第三阶段：重新分片、替换文件和检索测试

- 实现单文件重新分片。
- 实现知识库全部重新分片。
- 实现重新上传替换源文件。
- 实现检索测试页。
- 把聊天 RAG 过滤从标签扩展到知识库 ID。

验收标准：

- 替换文件后旧分片被删除，新分片可检索。
- 单文件重新分片不会影响其他文件。
- 全部重新分片只影响当前知识库。
- 检索测试只返回当前知识库命中结果。
- 绑定智能体后，聊天只检索该智能体关联的启用知识库。

## 风险与处理

- 本地文件和数据库事务无法天然一致：数据库成功但文件删除失败时，需要记录日志并允许后续再次删除。
- 大文件解析会影响接口耗时：第一版同步处理即可，后续数据量变大再引入后台任务。
- 当前 `documents.id` 插入代码使用 `gen_random_uuid()`，而 schema 已倾向 Snowflake 字符串 ID。实现时需要统一 ID 生成方式，避免新旧数据风格混乱。
- API Key 不应明文返回前端。第一版如果没有安全加密方案，可以只允许新增或重置，不回显真实值。
- 现有工作区已有 prompt 相关未提交改动，实施时要避开无关文件，避免覆盖其他改动。

## 验收清单

- 新建知识库后列表出现一条记录。
- 查看知识库能看到配置详情。
- 编辑知识库能更新名称、描述和配置字段。
- 禁用知识库后，该知识库不参与检索和聊天 RAG。
- 删除知识库后，数据库配置、文件、分片和本地目录均被清理。
- 上传文件后，本地目录存在源文件。
- 文档列表显示文件名、大小、分片数、状态。
- 查看分片能看到每个分片内容、序号和范围。
- 编辑分片后，该分片 embedding 被重新生成。
- 删除分片后，文件分片数同步减少。
- 下载源文件能得到原始上传文件。
- 重新上传会替换源文件并重建分片。
- 单文件重新分片只影响当前文件。
- 全部重新分片只影响当前知识库。
- 检索测试返回当前知识库范围内的命中分片。
