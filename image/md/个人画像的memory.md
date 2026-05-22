# AI Engine Memory System 开发需求文档（简化目录版）

目标：

构建一套完整 AI Memory System，用于支持：

- 多轮上下文记忆
- 自动摘要压缩
- 长期用户画像
- 语义向量记忆
- Prompt 自动拼装
- Agent Memory 管理

要求：

- 与业务解耦
- 可独立作为 ai-engine 模块
- 不要过度拆文件夹
- 所有 memory 相关统一放到 memory 目录

***

# 一、最终目录结构（简化版）

```
src/
├── memory/
│   ├── memory.manager.ts
│   ├── short.memory.ts
│   ├── summary.memory.ts
│   ├── profile.memory.ts
│   ├── vector.memory.ts
│   ├── prompt.builder.ts
│   ├── profile.extractor.ts
│   ├── memory.store.ts
│   ├── memory.types.ts
│   └── index.ts

```

***

# 二、整体目标

Memory 系统需要支持：

1. Short-Term Memory（短期上下文）
2. Sliding Window（自动截断）
3. Summary Memory（自动摘要）
4. Long-Term Memory（用户画像）
5. Semantic Memory（向量语义记忆）
6. Prompt Builder（Prompt组装）

最终流程：

```
用户输入
↓
Short Memory
↓
Summary Memory
↓
Profile Memory
↓
Vector Memory
↓
Prompt Builder
↓
LLM

```

***

# 三、各文件职责

***

## 1. memory.manager.ts

整个 Memory 系统总调度器。

职责：

- 加载 memory
- 保存聊天
- 自动截断
- 自动摘要
- 向量召回
- 用户画像提取
- Prompt 构建

核心接口：

```
class MemoryManager {
  loadMemory(sessionId: string, userId: string)

  appendMessage(sessionId: string, message: ChatMessage)

  summarizeIfNeeded(sessionId: string)

  retrieveSemanticMemory(query: string)

  extractProfileMemory(message: string)

  buildPrompt(input: string)
}

```

***

## 2. short.memory.ts

短期上下文 Memory。

功能：

- 保存最近聊天
- Sliding Window
- 自动裁剪上下文

规则：

```
默认保留最近20条消息

```

示例：

```
messages = messages.slice(-20)

```

接口：

```
interface ShortMemory {
  get(sessionId: string)

  append(sessionId: string, message: ChatMessage)

  trim(sessionId: string)

  clear(sessionId: string)
}

```

存储：

- Redis
- 内存 Map

***

## 3. summary.memory.ts

自动摘要系统。

目标：

解决：

```
聊天越来越长
token爆炸

```

功能：

- 自动历史压缩
- 自动生成 summary
- 替换旧聊天

触发条件：

```
token > 4000

```

流程：

```
旧聊天
↓
LLM summarize
↓
生成 summary
↓
替换历史消息

```

summary 示例：

```
用户最近讨论：
- Vue3
- AI Workflow
- LangGraph

```

接口：

```
interface SummaryMemory {
  summarize(messages: ChatMessage[])

  saveSummary(sessionId: string, summary: string)

  getSummary(sessionId: string)
}

```

***

## 4. profile.memory.ts

长期用户画像。

注意：

不要存 message。

必须存：

```
结构化长期信息

```

示例：

```
{
  "tech_stack": "vue",
  "industry": "medical",
  "role": "frontend"
}

```

功能：

- 保存用户长期信息
- 更新画像
- Prompt 注入

数据库建议：

```
user_memory
------------
id
user_id
key
value
confidence
updated_at

```

接口：

```
interface ProfileMemory {
  save(userId: string, memory: ProfileItem)

  get(userId: string)

  merge(userId: string)
}

```

***

## 5. profile.extractor.ts

长期记忆提取器。

目标：

自动从聊天中提取：

```
用户长期特征

```

示例：

输入：

```
我是 Vue 前端开发

```

输出：

```
{
  "key": "tech_stack",
  "value": "vue"
}

```

功能：

- LLM 提取
- Regex 提取
- 规则提取
- 合并长期记忆

接口：

```
class ProfileExtractor {
  extract(text: string)
}

```

***

## 6. vector.memory.ts

语义记忆系统。

目标：

实现：

```
Semantic Memory

```

不是 key-value。

而是：

```
历史聊天 embedding

```

流程：

```
聊天记录
↓
chunk
↓
embedding
↓
vector db

```

推荐：

- pgvector
- milvus
- pinecone

检索流程：

```
用户问题
↓
embedding
↓
similarity search
↓
召回相关历史

```

接口：

```
interface VectorMemory {
  embed(text: string)

  save(document: VectorDocument)

  search(query: string)

  delete(sessionId: string)
}

```

***

## 7. prompt.builder.ts

整个系统核心。

职责：

统一拼接：

- system prompt
- 用户画像
- summary
- vector recall
- recent chats
- 当前问题

最终 Prompt：

```
system:
你是AI助手

用户画像:
- Vue前端
- 医疗行业

历史摘要:
用户最近研究 AI Workflow

相关历史:
- 用户问过 LangGraph
- 用户问过 RAG

最近聊天:
xxxx

当前问题:
xxxx

```

要求：

- token 控制
- 去重
- memory 权重控制
- 避免 prompt 污染

接口：

```
class PromptBuilder {
  build(params: BuildPromptParams)
}

```

***

## 8. memory.store.ts

统一 Memory 存储层。

封装：

- Redis
- MySQL/Postgres
- Vector DB

职责：

统一 CRUD。

避免业务直接操作数据库。

接口：

```
interface MemoryStore {
  get(key: string)

  set(key: string, value: any)

  delete(key: string)
}

```

***

## 9. memory.types.ts

统一类型定义。

包括：

```
ChatMessage
ProfileItem
MemoryContext
VectorDocument
BuildPromptParams
SummaryResult

```

***

# 四、完整 Memory 工作流

```
用户输入
↓
读取 Short Memory
↓
读取 Summary Memory
↓
读取 Profile Memory
↓
向量召回 Semantic Memory
↓
Prompt Builder 组装 Prompt
↓
调用 LLM
↓
保存聊天
↓
更新 Short Memory
↓
触发 Summary
↓
触发 Profile Extractor
↓
写入 Vector Memory

```

***

# 五、技术栈

推荐：

```
Node.js
TypeScript
Redis
PostgreSQL
pgvector

```

要求：

- 可扩展
- 可插拔
- 支持 Agent
- 支持 Workflow
- 支持 Graph
- 与业务完全解耦

***

# 六、设计理念（重点）

Memory 核心：

不是：

```
存储多少历史

```

而是：

```
在正确时间
给模型正确上下文

```

真正核心：

- Prompt Builder
- Summary Strategy
- Memory Retrieval Strategy

向量库只是：

```
召回工具

```

不是 Memory 核心。
