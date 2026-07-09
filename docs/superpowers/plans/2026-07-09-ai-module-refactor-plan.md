# AI Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the current AI backend into a clear `knowledge-bot` business API and a NestJS-DI-based `ai-engine` capability layer, while adding authenticated streaming chat and knowledge-base management.

**Architecture:** `src/modules/knowledge-bot` owns HTTP contracts, DTOs, permissions, and frontend-facing behavior. `src/ai-engine` owns reusable AI capabilities: LLM calls, streaming, embeddings, vector storage, retrieval, and tool execution. The existing long chain `AIRuntime -> Orchestrator -> WorkflowEngine -> workflow -> node -> global provider` will be reduced in stages so every stage compiles and has a clear rollback point.

**Tech Stack:** NestJS 10, TypeScript, Prisma 5, PostgreSQL with pgvector, `nestjs-prisma`, `@nestjs/config`, `@nestjs/swagger`, `class-validator`, OpenAI-compatible LLM and embedding APIs, Jest and supertest.

---

## Scope And Non-Goals

This plan is for the backend project at `F:\公司项目\gitee\nestjs-prisma`.

The frontend project `F:\公司项目\gitee\fullstack-admin-serve\vue-element-admin-dev` is a consumer of these APIs. Frontend API wrapper and page work should be planned separately after the backend contracts are stable.

Do not run database reset, force push, real seed, or destructive Prisma commands during this refactor. Do not execute real remote AI calls in automated tests. Use mocks for LLM, embedding, and vector storage behavior.

Do not convert write APIs to `PUT`, `PATCH`, or `DELETE`. New write operations use `POST`, and read operations use `GET`.

Do not commit temporary unit test files if local-only tests are created for implementation confidence. E2E tests under the existing `test` directory can be committed only when they are part of the accepted backend contract.

## Current Problems To Fix

- `src/modules/chat` and `src/modules/knowledge-bot/chat` are two competing chat entrances. The frontend should only consume `knowledge-bot`.
- `AIRuntime` is created by NestJS but manually constructs `IntentRouter` and `Orchestrator`, while `AIEngineModule` also registers `Orchestrator`.
- `llmProvider`, `embeddingProvider`, and `vectorStore` are global singleton exports, so callers bypass NestJS dependency injection.
- `PrismaVectorStore` creates its own `new PrismaClient()`, which does not match the project rule to use `PrismaService` in runtime business code.
- `WorkflowEngine` mixes chat, RAG, tool decision, summary, stream placeholder behavior, prompt building, and result formatting.
- `knowledge-bot` controllers use inline request shapes instead of DTO classes.
- `knowledge-bot` routes are marked `@Public()`, but the target product behavior is backend-admin permission control.
- Current `WorkflowEngine.stream()` is only a placeholder and cannot satisfy the required streaming chat page.

## Target Runtime Flow

Non-streaming debug flow:

```text
KnowledgeBotChatController
-> KnowledgeBotChatService
-> AiOrchestratorService
-> LlmService / KnowledgeVectorService / ToolExecutorService
```

Streaming chat flow:

```text
KnowledgeBotChatController.stream()
-> KnowledgeBotChatService.stream()
-> AiOrchestratorService.stream()
-> LlmService.stream()
-> Express Response SSE output
```

Knowledge management flow:

```text
KnowledgeController
-> KnowledgeService
-> KnowledgeVectorService
-> EmbeddingService
-> PrismaService
```

## Target File Structure

Create or reshape files toward this structure:

```text
src/ai-engine
├── ai-engine.module.ts
├── llm
│   ├── llm.interface.ts
│   └── llm.service.ts
├── embedding
│   ├── embedding.interface.ts
│   └── embedding.service.ts
├── vector
│   ├── vector-store.interface.ts
│   └── vector-store.service.ts
├── orchestrator
│   ├── ai-orchestrator.service.ts
│   └── ai-route.types.ts
└── tools
    └── tool.executor.ts

src/modules/knowledge-bot
├── chat
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── dto
│       └── chat.dto.ts
├── knowledge
│   ├── knowledge.controller.ts
│   ├── knowledge.service.ts
│   └── dto
│       ├── create-knowledge.dto.ts
│       ├── delete-knowledge.dto.ts
│       ├── knowledge-list.dto.ts
│       ├── revector-knowledge.dto.ts
│       └── search-knowledge.dto.ts
├── ai
│   └── tools
│       └── get-user-menu-permissions.tool.ts
└── knowledge-bot.module.ts
```

Keep existing files in place until a task explicitly moves or deletes them. Each task below should leave the project compiling.

## Progress Snapshot - 2026-07-09

Current branch: `langchain`.

Completed:
- Task 1: Stable DTO contracts for knowledge-bot chat.
- Task 2: Knowledge-bot routes moved behind backend permissions.
- Task 3: Injectable LLM and embedding services added to `AIEngineModule`.
- Task 4: Injectable `VectorStoreService` added and `KnowledgeService` switched to DI.
- Task 5: Knowledge list, delete, revector, search DTO and service contracts added.
- Task 6: Knowledge file upload endpoint added.
- Task 7: Knowledge-bot streaming chat endpoint added.
- Task 8 Step 1: Frontend reference search completed. `rg -n "/chat|chat/stream|knowledge-bot/chat" "F:\公司项目\gitee\fullstack-admin-serve\vue-element-admin-dev\src"` returned no matches.
- Task 8 Step 2: Old `ChatModule` removed from the AI Swagger group; `AI模块` now includes only `KnowledgeBotModule`.
- Task 8 Step 3-4: Old `ChatModule` removed from `AppModule`, `src/modules/chat/*` deleted, and TypeScript verification passed.
- Task 9: Legacy AI runtime, workflow, node, router, global LLM/embedding provider, and old vector-store files removed after reference checks. `src/ai-engine/core/interfaces.ts` remains because tool definitions still use it.
- Task 10: AI environment placeholders added to `.env.example`; stale `CHAT_API_URL` / `CHAT_API_KEY` references removed with the old chat module.
- Task 11: Backend verification pass completed.

Latest verified commands:
- `npm.cmd test -- swagger-docs.spec.ts --runInBand` -> passed, 2 tests.
- `npx.cmd tsc --noEmit` -> passed.
- `npm.cmd run build` -> passed after clearing ignored generated `dist` leftovers.
- `npm.cmd run test:e2e -- --runInBand` -> passed, 1 suite and 2 tests.
- `git diff --check` -> passed with line-ending warnings only.

Important remaining work:
- Manual auth boundary was partially live-tested: `POST /knowledge-bot/chat` returned `401` without token and `403` with a token lacking permissions; `POST /knowledge-bot/knowledge/upload` returned `401` without token. A fully authorized happy path was not live-tested to avoid real database writes and remote embedding calls.

---

## Task 1: Add Stable DTO Contracts For Knowledge Bot Chat

**Files:**
- Create: `src/modules/knowledge-bot/chat/dto/chat.dto.ts`
- Modify: `src/modules/knowledge-bot/chat/chat.controller.ts`
- Modify: `src/modules/knowledge-bot/chat/chat.service.ts`

- [x] **Step 1: Create chat DTOs**

Add `src/modules/knowledge-bot/chat/dto/chat.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class ChatRequestDto {
  @ApiProperty({ description: '用户消息' })
  @IsString()
  message: string

  @ApiPropertyOptional({ description: '用户 ID；不传时不读取或写入短期记忆' })
  @IsString()
  @IsOptional()
  userId?: string
}

export class ChatStreamRequestDto extends ChatRequestDto {}
```

- [x] **Step 2: Replace inline body type in chat controller**

Update `src/modules/knowledge-bot/chat/chat.controller.ts` so the body type uses `ChatRequestDto`:

```ts
import { Controller, Post, Body } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ChatService } from './chat.service'
import { ChatRequestDto } from './dto/chat.dto'

@ApiTags('知识库模块')
@Controller('knowledge-bot/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: '知识库对话' })
  @ApiBody({ type: ChatRequestDto })
  @Post()
  async chat(@Body() body: ChatRequestDto) {
    return this.chatService.chat(body.message, body.userId)
  }
}
```

- [x] **Step 3: Keep service method signature stable**

Keep `src/modules/knowledge-bot/chat/chat.service.ts` accepting `message` and optional `userId`:

```ts
async chat(message: string, userId?: string) {
  return this.aiRuntime.run({
    input: message,
    userId,
    metadata: {
      source: 'knowledge-bot',
    },
  })
}
```

- [x] **Step 4: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 2: Move Knowledge Bot Routes Behind Backend Permissions

**Files:**
- Modify: `src/modules/knowledge-bot/chat/chat.controller.ts`
- Modify: `src/modules/knowledge-bot/knowledge/knowledge.controller.ts`
- Check: `src/common/decorators/permissions.decorator.ts`
- Check: `src/common/guards/permissions.guard.ts`

- [x] **Step 1: Remove `@Public()` from knowledge-bot controllers**

In both controllers, remove imports of `Public` and remove all `@Public()` decorators.

- [x] **Step 2: Add permission decorators to chat endpoints**

Use the existing project decorator:

```ts
import { Permissions } from '../../../common/decorators/permissions.decorator'
```

Add to chat endpoint:

```ts
@Permissions('ai:chat:send')
```

- [x] **Step 3: Add permission decorators to knowledge endpoints**

For the current existing endpoints:

```ts
@Permissions('ai:knowledge:upload')
@Post()
async createKnowledge(...) {}

@Permissions('ai:knowledge:search')
@Get('search')
async searchSimilar(...) {}
```

Use these final permission codes for the whole AI menu:

```text
ai:chat:send
ai:knowledge:list
ai:knowledge:upload
ai:knowledge:delete
ai:knowledge:revector
ai:knowledge:search
```

- [ ] **Step 4: Verify unauthorized access expectation**

Progress note: permission decorators were added and compile passed, but live HTTP verification has not been run yet.

Manual API expectation after running the server:

```text
No Bearer token -> 401
Bearer token without permission -> 403
Bearer token with permission -> normal business response
```

- [x] **Step 5: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 3: Introduce AI Engine Provider Services

**Files:**
- Create: `src/ai-engine/llm/llm.interface.ts`
- Create: `src/ai-engine/llm/llm.service.ts`
- Create: `src/ai-engine/embedding/embedding.interface.ts`
- Create: `src/ai-engine/embedding/embedding.service.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`

- [x] **Step 1: Create LLM interface**

Add `src/ai-engine/llm/llm.interface.ts`:

```ts
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmServiceContract {
  invoke(prompt: string): Promise<string>
  invokeWithMessages(messages: ChatMessage[]): Promise<string>
  streamWithMessages(messages: ChatMessage[]): AsyncIterable<string>
}
```

- [x] **Step 2: Create injectable LLM service**

Add `src/ai-engine/llm/llm.service.ts`:

```ts
import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'
import { ChatMessage, LlmServiceContract } from './llm.interface'

@Injectable()
export class LlmService implements LlmServiceContract {
  private readonly client = new OpenAI({
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseURL: process.env.SILICONFLOW_BASE_URL,
  })

  async invoke(prompt: string): Promise<string> {
    return this.invokeWithMessages([{ role: 'user', content: prompt }])
  }

  async invokeWithMessages(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages,
      temperature: 0.2,
      top_p: 0.8,
    })

    return res.choices[0].message.content || ''
  }

  async *streamWithMessages(messages: ChatMessage[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      messages,
      temperature: 0.2,
      top_p: 0.8,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }
}
```

- [x] **Step 3: Create embedding interface**

Add `src/ai-engine/embedding/embedding.interface.ts`:

```ts
export interface EmbeddingServiceContract {
  createEmbedding(text: string): Promise<number[]>
}
```

- [x] **Step 4: Create injectable embedding service**

Add `src/ai-engine/embedding/embedding.service.ts`:

```ts
import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'
import { EmbeddingServiceContract } from './embedding.interface'

@Injectable()
export class EmbeddingService implements EmbeddingServiceContract {
  private readonly client = new OpenAI({
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseURL: process.env.SILICONFLOW_BASE_URL,
  })

  async createEmbedding(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: process.env.SILICONFLOW_EMBEDDING_MODEL || 'Alibaba-NLP/gte-Qwen2-7B-instruct',
      input: text,
    })

    return res.data[0].embedding
  }
}
```

- [x] **Step 5: Register services in AIEngineModule**

Add providers and exports in `src/ai-engine/ai-engine.module.ts`:

```ts
import { LlmService } from './llm/llm.service'
import { EmbeddingService } from './embedding/embedding.service'

@Module({
  providers: [
    LlmService,
    EmbeddingService,
    // existing providers remain during this task
  ],
  exports: [
    LlmService,
    EmbeddingService,
    // existing exports remain during this task
  ],
})
```

- [x] **Step 6: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 4: Replace Global Vector Store With Injectable Vector Store Service

**Files:**
- Create: `src/ai-engine/vector/vector-store.interface.ts`
- Create: `src/ai-engine/vector/vector-store.service.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`
- Modify: `src/modules/knowledge-bot/knowledge/knowledge.service.ts`
- Later cleanup candidate: `src/ai-engine/infra/vector-store.provider.ts`

- [x] **Step 1: Create vector store interface**

Add `src/ai-engine/vector/vector-store.interface.ts`:

```ts
export interface SearchResult {
  id: string
  content: string
  metadata?: Record<string, any>
  distance: number
}

export interface AddDocumentsResult {
  success: boolean
  count: number
}

export interface KnowledgeDocumentListItem {
  id: string
  content: string
  metadata?: Record<string, any>
  createdAt: Date
}
```

- [x] **Step 2: Create injectable vector store service**

Add `src/ai-engine/vector/vector-store.service.ts`:

```ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { EmbeddingService } from '../embedding/embedding.service'
import { splitText } from '../infra/text-chunker'
import { AddDocumentsResult, KnowledgeDocumentListItem, SearchResult } from './vector-store.interface'

@Injectable()
export class VectorStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async addDocuments(contents: string[], metadata?: Record<string, any>): Promise<AddDocumentsResult> {
    const chunks = contents.flatMap((content) => splitText(content))

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await this.embeddingService.createEmbedding(chunk)
      await this.prisma.$executeRaw`
        INSERT INTO documents (id, content, metadata, embedding)
        VALUES (
          gen_random_uuid(),
          ${chunk},
          ${JSON.stringify({ ...metadata, chunkIndex: i })}::jsonb,
          ${JSON.stringify(embedding)}::vector
        )
      `
    }

    return { success: true, count: chunks.length }
  }

  async similaritySearch(query: string, limit = 5): Promise<SearchResult[]> {
    const embedding = await this.embeddingService.createEmbedding(query)
    const result = await this.prisma.$queryRaw`
      SELECT
        id,
        content,
        metadata,
        embedding <=> ${JSON.stringify(embedding)}::vector AS distance
      FROM documents
      ORDER BY distance ASC
      LIMIT ${limit}
    `

    return result as SearchResult[]
  }

  async list(pageNum = 1, pageSize = 10): Promise<{ list: KnowledgeDocumentListItem[]; total: number }> {
    const skip = (pageNum - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.document.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, metadata: true, createdAt: true },
      }),
      this.prisma.document.count(),
    ])

    return { list: list as KnowledgeDocumentListItem[], total }
  }

  async deleteById(id: string): Promise<{ success: boolean }> {
    await this.prisma.document.delete({ where: { id } })
    return { success: true }
  }
}
```

- [x] **Step 3: Register VectorStoreService**

In `src/ai-engine/ai-engine.module.ts`, add:

```ts
import { VectorStoreService } from './vector/vector-store.service'

providers: [
  VectorStoreService,
]

exports: [
  VectorStoreService,
]
```

- [x] **Step 4: Switch KnowledgeService to DI**

Update `src/modules/knowledge-bot/knowledge/knowledge.service.ts`:

```ts
import { Injectable } from '@nestjs/common'
import { VectorStoreService } from '../../../ai-engine/vector/vector-store.service'

@Injectable()
export class KnowledgeService {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  async createKnowledge(content: string, metadata?: Record<string, any>) {
    return this.vectorStoreService.addDocuments([content], metadata)
  }

  async searchSimilar(query: string, limit?: number) {
    return this.vectorStoreService.similaritySearch(query, limit)
  }
}
```

- [x] **Step 5: Verify no new runtime PrismaClient is introduced**

Run:

```powershell
rg -n "new PrismaClient" src
```

Expected during this task: only existing legacy file `src\ai-engine\infra\vector-store.provider.ts` may remain. No new match should appear.

- [x] **Step 6: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 5: Add Knowledge Base Management Contracts

**Files:**
- Create: `src/modules/knowledge-bot/knowledge/dto/create-knowledge.dto.ts`
- Create: `src/modules/knowledge-bot/knowledge/dto/knowledge-list.dto.ts`
- Create: `src/modules/knowledge-bot/knowledge/dto/delete-knowledge.dto.ts`
- Create: `src/modules/knowledge-bot/knowledge/dto/revector-knowledge.dto.ts`
- Create: `src/modules/knowledge-bot/knowledge/dto/search-knowledge.dto.ts`
- Modify: `src/modules/knowledge-bot/knowledge/knowledge.controller.ts`
- Modify: `src/modules/knowledge-bot/knowledge/knowledge.service.ts`
- Modify: `src/ai-engine/vector/vector-store.service.ts`

- [x] **Step 1: Create DTOs**

Add DTO classes:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateKnowledgeDto {
  @ApiProperty({ description: '知识内容' })
  @IsString()
  content: string

  @ApiPropertyOptional({ description: '知识元数据' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}

export class KnowledgeListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNum?: number

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number
}

export class DeleteKnowledgeDto {
  @ApiProperty({ description: '知识分片 ID' })
  @IsString()
  id: string
}

export class RevectorKnowledgeDto {
  @ApiProperty({ description: '知识分片 ID' })
  @IsString()
  id: string
}

export class SearchKnowledgeDto {
  @ApiProperty({ description: '检索关键词' })
  @IsString()
  query: string

  @ApiPropertyOptional({ description: '返回数量', default: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number
}
```

Place each class in the file listed for it, or group them into fewer DTO files only if imports stay clear and the class names remain unchanged.

- [x] **Step 2: Add knowledge list endpoint**

In `knowledge.controller.ts`:

```ts
@Permissions('ai:knowledge:list')
@Get('list')
async list(@Query() query: KnowledgeListDto) {
  return this.knowledgeService.list(query)
}
```

- [x] **Step 3: Add knowledge delete endpoint**

```ts
@Permissions('ai:knowledge:delete')
@Post('delete')
async delete(@Body() body: DeleteKnowledgeDto) {
  return this.knowledgeService.delete(body.id)
}
```

- [x] **Step 4: Add revector endpoint**

```ts
@Permissions('ai:knowledge:revector')
@Post('revector')
async revector(@Body() body: RevectorKnowledgeDto) {
  return this.knowledgeService.revector(body.id)
}
```

- [x] **Step 5: Add service methods**

In `KnowledgeService`:

```ts
async list(query: KnowledgeListDto) {
  return this.vectorStoreService.list(query.pageNum || 1, query.pageSize || 10)
}

async delete(id: string) {
  return this.vectorStoreService.deleteById(id)
}

async revector(id: string) {
  return this.vectorStoreService.revectorById(id)
}
```

- [x] **Step 6: Add vector revector method**

In `VectorStoreService`:

```ts
async revectorById(id: string): Promise<{ success: boolean }> {
  const document = await this.prisma.document.findUnique({
    where: { id },
    select: { content: true },
  })

  if (!document) {
    throw new Error('知识内容不存在')
  }

  const embedding = await this.embeddingService.createEmbedding(document.content)
  await this.prisma.$executeRaw`
    UPDATE documents
    SET embedding = ${JSON.stringify(embedding)}::vector
    WHERE id = ${id}
  `

  return { success: true }
}
```

- [x] **Step 7: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 6: Add Knowledge File Upload Endpoint

**Files:**
- Modify: `src/modules/knowledge-bot/knowledge/knowledge.controller.ts`
- Modify: `src/modules/knowledge-bot/knowledge/knowledge.service.ts`

- [x] **Step 1: Add upload imports**

In `knowledge.controller.ts`:

```ts
import { UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
```

- [x] **Step 2: Add upload endpoint**

Use POST because upload writes data:

```ts
@Permissions('ai:knowledge:upload')
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File, @Body('metadata') metadata?: string) {
  return this.knowledgeService.upload(file, metadata)
}
```

- [x] **Step 3: Add upload service method**

In `KnowledgeService`:

```ts
async upload(file: Express.Multer.File, metadata?: string) {
  const content = file.buffer.toString('utf-8')
  const parsedMetadata = metadata ? JSON.parse(metadata) : undefined
  return this.vectorStoreService.addDocuments([content], {
    ...parsedMetadata,
    fileName: file.originalname,
  })
}
```

- [ ] **Step 4: Verify upload request shape**

Progress note: upload endpoint shape was implemented; live multipart upload has not been manually tested yet.

Manual request shape:

```text
POST /knowledge-bot/knowledge/upload
Content-Type: multipart/form-data
field file: selected text/markdown document
field metadata: {"source":"manual-upload","type":"doc"}
```

- [x] **Step 5: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 7: Add Real Streaming Chat Under Knowledge Bot

**Files:**
- Modify: `src/modules/knowledge-bot/chat/chat.controller.ts`
- Modify: `src/modules/knowledge-bot/chat/chat.service.ts`
- Create: `src/ai-engine/orchestrator/ai-orchestrator.service.ts`
- Modify: `src/ai-engine/ai-engine.module.ts`

- [x] **Step 1: Create orchestrator service**

Add `src/ai-engine/orchestrator/ai-orchestrator.service.ts`:

```ts
import { Injectable } from '@nestjs/common'
import { LlmService } from '../llm/llm.service'
import { VectorStoreService } from '../vector/vector-store.service'

@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly llmService: LlmService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async chat(message: string) {
    const answer = await this.llmService.invoke(message)
    return { answer, route: 'chat' }
  }

  async *stream(message: string): AsyncIterable<string> {
    for await (const content of this.llmService.streamWithMessages([{ role: 'user', content: message }])) {
      yield content
    }
  }

  async rag(message: string) {
    const docs = await this.vectorStoreService.similaritySearch(message, 5)
    const context = docs.map((item) => item.content).join('\n')
    const answer = await this.llmService.invoke(`请根据以下知识回答问题：\n${context}\n\n问题：${message}`)
    return { answer, route: 'rag' }
  }
}
```

- [x] **Step 2: Register orchestrator service**

In `AIEngineModule`:

```ts
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service'

providers: [
  AiOrchestratorService,
]

exports: [
  AiOrchestratorService,
]
```

- [x] **Step 3: Inject orchestrator into chat service**

In `chat.service.ts`:

```ts
constructor(private readonly aiOrchestratorService: AiOrchestratorService) {}

async chat(message: string, userId?: string) {
  return this.aiOrchestratorService.chat(message)
}

async stream(message: string) {
  return this.aiOrchestratorService.stream(message)
}
```

- [x] **Step 4: Add SSE endpoint**

In `chat.controller.ts`:

```ts
import { Body, Controller, Post, Res } from '@nestjs/common'
import { Response } from 'express'
import { ChatStreamRequestDto } from './dto/chat.dto'

@Permissions('ai:chat:send')
@ApiOperation({ summary: '知识库流式对话' })
@Post('stream')
async stream(@Body() body: ChatStreamRequestDto, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  for await (const content of await this.chatService.stream(body.message)) {
    res.write(`data: ${JSON.stringify({ content })}\n\n`)
  }

  res.write('data: [DONE]\n\n')
  res.end()
}
```

- [x] **Step 5: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

- [x] **Step 6: Verify frontend contract**

The frontend must consume chunks as SSE-like lines:

```text
data: {"content":"partial text"}
data: [DONE]
```

---

## Task 8: Remove Or Bypass The Old ChatModule As A Frontend Entry

**Files:**
- Check: `src/modules/chat/chat.controller.ts`
- Check: `src/modules/chat/chat.service.ts`
- Modify: `src/common/swagger/swagger-docs.ts`
- Modify: `src/app.module.ts` only if old module is confirmed unused

- [x] **Step 1: Search for `/chat` frontend references**

Run in the frontend repository:

```powershell
rg -n "/chat|chat/stream|knowledge-bot/chat" F:\公司项目\gitee\fullstack-admin-serve\vue-element-admin-dev\src
```

Expected before deletion: no production page depends on backend `/chat/stream`.

- [x] **Step 2: Remove old ChatModule from AI Swagger group**

If old `/chat` routes are kept temporarily, remove them from the AI Swagger group so they are not presented as the recommended AI API:

```ts
{ name: 'AI模块', url: '/api-docs/ai-json', modules: [KnowledgeBotModule] }
```

- [x] **Step 3: Remove old module after confirmed unused**

Only after Step 1 confirms no active consumer, remove `ChatModule` from `AppModule` imports and delete the old module files:

```text
src/modules/chat/chat.controller.ts
src/modules/chat/chat.service.ts
src/modules/chat/chat.module.ts
src/modules/chat/dto/create-chat.dto.ts
src/modules/chat/dto/update-chat.dto.ts
```

- [x] **Step 4: Verify compile**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 9: Clean Up Legacy AI Engine Layers After The New Flow Works

**Files:**
- Check: `src/ai-engine/core/ai.runtime.ts`
- Check: `src/ai-engine/core/orchestrator.ts`
- Check: `src/ai-engine/core/workflow.engine.ts`
- Check: `src/ai-engine/workflow/*`
- Check: `src/ai-engine/nodes/*`
- Check: `src/ai-engine/models/*`
- Check: `src/ai-engine/infra/vector-store.provider.ts`

- [x] **Step 1: Search current references**

Run:

```powershell
rg -n "AIRuntime|WorkflowEngine|ragWorkflow|chatWorkflow|llmProvider|embeddingProvider|vectorStore|from '../nodes|from '../workflow|from '../models|from '../infra/vector-store.provider'" src
```

Expected after Tasks 3 to 8: active `knowledge-bot` code should use `AiOrchestratorService`, `LlmService`, `EmbeddingService`, and `VectorStoreService`.

- [x] **Step 2: Delete files only when reference count is zero**

Delete a legacy file only when `rg` proves no active import remains. Candidate files:

```text
src/ai-engine/core/ai.runtime.ts
src/ai-engine/core/orchestrator.ts
src/ai-engine/core/workflow.engine.ts
src/ai-engine/workflow/chat.workflow.ts
src/ai-engine/workflow/rag.workflow.ts
src/ai-engine/nodes/chat.node.ts
src/ai-engine/nodes/rag-answer.node.ts
src/ai-engine/nodes/retrieval.node.ts
src/ai-engine/nodes/router.node.ts
src/ai-engine/models/llm.provider.ts
src/ai-engine/models/embedding.provider.ts
src/ai-engine/infra/vector-store.provider.ts
```

- [x] **Step 3: Keep shared interfaces that are still used**

Do not delete `src/ai-engine/core/interfaces.ts` if `ToolDefinition` is still used by `knowledge-bot` tools. Move the tool-related interfaces into `src/ai-engine/tools/tool.interface.ts` only if that reduces imports without changing behavior.

- [x] **Step 4: Verify no stale imports**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

---

## Task 10: Update Environment Documentation

**Files:**
- Modify: `.env.example`
- Check: `src/common/configs/config.ts`
- Check: `src/common/configs/config.interface.ts`
- Check: `README.md`

- [x] **Step 1: Add AI environment placeholders**

Add placeholder variables to `.env.example`:

```dotenv
SILICONFLOW_API_KEY=your_siliconflow_api_key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Qwen/Qwen2.5-7B-Instruct
SILICONFLOW_EMBEDDING_MODEL=Alibaba-NLP/gte-Qwen2-7B-instruct
```

- [x] **Step 2: Remove stale chat API variables if old ChatModule is deleted**

If the old `src/modules/chat` module is removed, do not keep `CHAT_API_URL` or `CHAT_API_KEY` as the recommended AI path. If another module still reads them, keep them and mark them as legacy model-direct variables in `.env.example`.

- [x] **Step 3: Verify no real secret is written**

Run:

```powershell
rg -n "sk-|Bearer [A-Za-z0-9]|password=.*[^_]|postgresql://[^$]" .env.example README.md src
```

Expected: no real API key, password, or database URL is introduced by this task.

---

## Task 11: Backend Verification Pass

**Files:**
- Check all changed files.

- [x] **Step 1: TypeScript verification**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`.

- [x] **Step 2: Build verification**

Run:

```powershell
npm.cmd run build
```

Expected: command exits with code `0`.

- [x] **Step 3: TypeScript verification after build**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: command exits with code `0`. This catches stale generated metadata/import problems after build.

- [x] **Step 4: E2E verification when database and auth environment are available**

Run:

```powershell
npm.cmd run test:e2e -- --runInBand
```

Expected: command exits with code `0`. If the command cannot run because database, network, or secrets are unavailable, record the exact failure reason in the final implementation report.

- [x] **Step 5: Git diff sanity check**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

---

## Backend And Frontend Contract Summary

After the backend refactor, the frontend should use these endpoints:

```text
POST /knowledge-bot/chat/stream
POST /knowledge-bot/chat
GET  /knowledge-bot/knowledge/list
POST /knowledge-bot/knowledge/upload
POST /knowledge-bot/knowledge/delete
POST /knowledge-bot/knowledge/revector
GET  /knowledge-bot/knowledge/search
```

AI menu and button permissions:

```text
AI管理
├── AI对话
│   └── ai:chat:send
└── 知识库管理
    ├── ai:knowledge:list
    ├── ai:knowledge:upload
    ├── ai:knowledge:delete
    ├── ai:knowledge:revector
    └── ai:knowledge:search
```

Suggested frontend route files:

```text
src/views/ai/chat/index.vue
src/views/ai/knowledge/index.vue
```

Suggested backend menu records:

```js
{ parentId: null, name: 'AI管理', path: '/ai', component: '/ai', icon: 'functionPage', sort: 30, type: 'DIRECTORY' }
{ parentId: AI_MENU_ID, name: 'AI对话', path: '/ai/chat', component: '/ai/chat/index', icon: 'methods', sort: 1, type: 'PAGE' }
{ parentId: AI_MENU_ID, name: '知识库管理', path: '/ai/knowledge', component: '/ai/knowledge/index', icon: 'basic-data', sort: 2, type: 'PAGE' }
```

## Self-Review

- Spec coverage: The plan covers `knowledge-bot` permission control, streaming chat, file upload, list, delete, revector, search, DI conversion, old chat cleanup, environment documentation, and verification.
- Placeholder scan: The plan contains concrete file paths, method names, endpoint names, permission codes, and commands. No implementation step depends on unspecified names.
- Type consistency: DTO names, service names, and permission codes are repeated consistently across tasks.
- Scope check: Backend refactor and frontend page implementation are separated. This plan only changes backend project files and states the frontend contract.
