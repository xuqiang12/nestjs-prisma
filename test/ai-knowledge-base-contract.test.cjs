// 校验知识库管理和运行时检索范围合同。
const assert = require('node:assert/strict')
const { existsSync, readdirSync, readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('knowledge base schema and migration exist', () => {
  const schema = readFileSync(join(rootDir, 'prisma/schema.prisma'), 'utf8')
  const migration = join(rootDir, 'prisma/migrations/20260730030000_add_ai_knowledge_base/migration.sql')
  const configMigration = join(rootDir, 'prisma/migrations/20260731010000_add_ai_knowledge_base_config/migration.sql')

  assert.match(schema, /model AiKnowledgeBase \{/)
  assert.match(schema, /model AiKnowledgeFile \{/)
  assert.match(schema, /model AiKnowledgeBaseAgent \{/)
  assert.match(schema, /knowledgeBaseId\s+String\?\s+@db\.VarChar\(32\)/)
  assert.match(schema, /fileId\s+String\?\s+@db\.VarChar\(32\)/)
  assert.match(schema, /chunkIndex\s+Int\?\s+@default\(0\)/)
  assert.match(schema, /chunkSize\s+Int\s+@default\(500\)/)
  assert.match(schema, /chunkOverlap\s+Int\s+@default\(100\)/)
  assert.match(schema, /retrievalLimit\s+Int\s+@default\(5\)/)
  assert.match(schema, /similarityThreshold\s+Float\s+@default\(0\.45\)/)
  assert.match(schema, /embeddingProfileCode\s+String\s+@default\("siliconflow-default"\)/)
  assert.match(schema, /embeddingApiKeyMode\s+String\s+@default\("env"\)/)
  assert.match(schema, /embeddingApiKeyRef\s+String\?\s+@default\("SILICONFLOW_API_KEY"\)/)
  assert.match(schema, /@@unique\(\[knowledgeBaseId,\s*agentId\]\)/)
  assert.ok(existsSync(migration), 'migration should create knowledge base tables and extend documents')
  assert.ok(existsSync(configMigration), 'migration should add configurable chunk and embedding profile fields')
})

test('knowledge base controller exposes page-level management contracts', () => {
  const controller = readFileSync(join(rootDir, 'src/modules/knowledge/knowledge-base/knowledge-base.controller.ts'), 'utf8')
  const module = readFileSync(join(rootDir, 'src/modules/knowledge/knowledge.module.ts'), 'utf8')
  const legacyModule = readFileSync(join(rootDir, 'src/modules/knowledge-bot/knowledge-bot.module.ts'), 'utf8')
  const legacyKnowledgeDir = join(rootDir, 'src/modules/knowledge-bot/knowledge-base')

  assert.match(controller, /@Controller\('knowledge\/knowledge-base'\)/)
  assert.match(controller, /@Get\('list'\)/)
  assert.match(controller, /@Get\('options'\)/)
  assert.match(controller, /knowledgeBases:\s*await this\.knowledgeBaseService\.enabledOptions\(\)/)
  assert.match(controller, /@Get\('detail'\)/)
  assert.match(controller, /@Post\(\)/)
  assert.match(controller, /@Post\('update'\)/)
  assert.match(controller, /@Post\('status'\)/)
  assert.match(controller, /@Post\('delete'\)/)
  assert.match(controller, /@Get\('file\/list'\)/)
  assert.match(controller, /@Post\('file\/upload'\)/)
  assert.match(controller, /@Get\('file\/download'\)/)
  assert.match(controller, /@Post\('file\/replace'\)/)
  assert.match(controller, /@Post\('file\/rechunk'\)/)
  assert.match(controller, /@Post\('file\/rechunk-all'\)/)
  assert.match(controller, /@Get\('chunk\/list'\)/)
  assert.match(controller, /@Get\('chunk\/detail'\)/)
  assert.match(controller, /@Post\('chunk\/update'\)/)
  assert.match(controller, /@Post\('chunk\/delete'\)/)
  assert.match(controller, /@Get\('search-test'\)/)
  assert.match(module, /KnowledgeBaseController/)
  assert.match(module, /KnowledgeBaseService/)
  assert.doesNotMatch(legacyModule, /KnowledgeBaseController/)
  assert.doesNotMatch(legacyModule, /KnowledgeBaseService/)
  const legacyFiles = existsSync(legacyKnowledgeDir)
    ? readdirSync(legacyKnowledgeDir, { recursive: true, withFileTypes: true }).filter((item) => item.isFile())
    : []
  assert.equal(legacyFiles.length, 0, 'legacy knowledge-bot/knowledge-base directory should not keep implementation files after full migration')
})

test('knowledge base implementation files live under modules/knowledge', () => {
  const expectedFiles = [
    'src/modules/knowledge/knowledge-base/dto/knowledge-base.dto.ts',
    'src/modules/knowledge/knowledge-base/embedding-profiles.ts',
    'src/modules/knowledge/knowledge-base/knowledge-base.controller.ts',
    'src/modules/knowledge/knowledge-base/knowledge-base.service.ts',
    'src/modules/knowledge/knowledge-base/knowledge-storage.service.ts',
  ]
  expectedFiles.forEach((file) => {
    assert.equal(existsSync(join(rootDir, file)), true, `${file} should exist`)
  })
})

test('knowledge bot module keeps conversation and AI tools only after chat v2 migration', () => {
  const module = readFileSync(join(rootDir, 'src/modules/knowledge-bot/knowledge-bot.module.ts'), 'utf8')

  assert.match(module, /ConversationController/)
  assert.match(module, /SearchKnowledgeTool/)
  assert.match(module, /GetUserMenuPermissionsTool/)
  assert.doesNotMatch(module, /ChatController/)
  assert.doesNotMatch(module, /ChatService/)
  assert.doesNotMatch(module, /knowledge-base\/knowledge-base\.controller/)
  assert.doesNotMatch(module, /knowledge-base\/knowledge-base\.service/)
})

test('knowledge base upload normalizes utf8 filenames before persistence', () => {
  const service = readFileSync(join(rootDir, 'src/modules/knowledge/knowledge-base/knowledge-base.service.ts'), 'utf8')

  assert.match(service, /private normalizeOriginalName\(originalName:\s*string\)/)
  assert.match(service, /Buffer\.from\(originalName,\s*'latin1'\)\.toString\('utf8'\)/)
  assert.match(service, /const originalName = this\.normalizeOriginalName\(file\.originalname\)/)
  assert.match(service, /originalName:\s*originalName/)
  assert.match(service, /saveFile\(knowledgeBase\.code,\s*createdFile\.id,\s*originalName,\s*file\.buffer\)/)
  assert.match(service, /fileName:\s*originalName/)
  assert.doesNotMatch(service, /originalName:\s*file\.originalname/)
})

test('knowledge base create and update use backend generated code and editable config fields', () => {
  const dto = readFileSync(join(rootDir, 'src/modules/knowledge/knowledge-base/dto/knowledge-base.dto.ts'), 'utf8')
  const service = readFileSync(join(rootDir, 'src/modules/knowledge/knowledge-base/knowledge-base.service.ts'), 'utf8')
  const profiles = readFileSync(join(rootDir, 'src/modules/knowledge/knowledge-base/embedding-profiles.ts'), 'utf8')
  const vectorStore = readFileSync(join(rootDir, 'src/ai-engine/vector/vector-store.service.ts'), 'utf8')
  const embeddingService = readFileSync(join(rootDir, 'src/ai-engine/embedding/embedding.service.ts'), 'utf8')

  assert.doesNotMatch(dto, /code:\s*string/, 'create DTO must not accept editable code')
  ;['chunkSize', 'chunkOverlap', 'retrievalLimit', 'similarityThreshold', 'embeddingProfileCode'].forEach((field) => {
    assert.match(dto, new RegExp(`${field}\\??:`), `${field} should be accepted by the DTO`)
    assert.match(service, new RegExp(field), `${field} should be persisted or used by service`)
  })
  assert.match(service, /private async nextKnowledgeBaseCode\(\)/)
  assert.match(service, /startsWith:\s*'ZSK'/)
  assert.match(service, /\^ZSK\\d\{16\}\$/)
  assert.match(service, /code:\s*await this\.nextKnowledgeBaseCode\(\)/)
  assert.match(service, /delete data\.code/, 'update should not modify generated code')
  assert.match(service, /embeddingProfiles\(\)/)
  assert.match(service, /enabledOptions\(\)/)
  assert.match(service, /this\.prisma\.aiKnowledgeBase\.findMany\(\{\s*where:\s*\{\s*status:\s*1\s*\}/)
  assert.match(profiles, /code:\s*'siliconflow-default'/)
  assert.match(profiles, /apiKeyRef:\s*'SILICONFLOW_API_KEY'/)
  assert.match(vectorStore, /chunkSize\?:\s*number/)
  assert.match(vectorStore, /chunkOverlap\?:\s*number/)
  assert.match(vectorStore, /embeddingConfig\?:/)
  assert.match(embeddingService, /createEmbedding\(text:\s*string,\s*config\?:/)
})

test('knowledge base detail page menu cleanup migration exists', () => {
  const migration = readFileSync(join(rootDir, 'prisma/migrations/20260731010000_add_ai_knowledge_base_config/migration.sql'), 'utf8')

  assert.match(migration, /\/AIEngine\/knowledge\/form/)
  assert.match(migration, /\/AIEngine\/knowledge\/detail/)
  assert.match(migration, /\/AIEngine\/knowledge\/edit/)
  assert.doesNotMatch(migration, /\/AIEngine\/knowledge\/document[^']*DELETE/i)
})

test('runtime filters rag by enabled knowledge base associations', () => {
  const contextTypes = readFileSync(join(rootDir, 'src/ai-runtime/context/agent-context.types.ts'), 'utf8')
  const contextBuilder = readFileSync(join(rootDir, 'src/ai-runtime/context/agent-context.builder.ts'), 'utf8')
  const ragHandler = readFileSync(join(rootDir, 'src/ai-runtime/executor/handlers/rag.handler.ts'), 'utf8')
  const orchestrator = readFileSync(join(rootDir, 'src/ai-engine/orchestrator/ai-orchestrator.service.ts'), 'utf8')
  const knowledgeQA = readFileSync(join(rootDir, 'src/ai-engine/knowledge-qa/knowledge-qa.service.ts'), 'utf8')
  const workflowTypes = readFileSync(join(rootDir, 'src/ai-engine/workflow/workflow.types.ts'), 'utf8')
  const workflowExecutor = readFileSync(join(rootDir, 'src/ai-engine/workflow/workflow-executor.service.ts'), 'utf8')
  const vectorStore = readFileSync(join(rootDir, 'src/ai-engine/vector/vector-store.service.ts'), 'utf8')

  assert.match(contextTypes, /knowledgeBaseIds:\s*string\[\]/)
  assert.match(contextBuilder, /knowledgeBases:\s*\{\s*where:\s*\{\s*knowledgeBase:\s*\{\s*status:\s*1\s*\}/)
  assert.match(contextBuilder, /knowledgeBaseIds:\s*agent\.knowledgeBases\.map\(\(item\) => item\.knowledgeBaseId\)/)
  assert.match(ragHandler, /knowledgeBaseIds:\s*context\.capabilities\.knowledgeBaseIds/)
  assert.match(orchestrator, /knowledgeBaseIds\?:\s*string\[\]/)
  assert.match(orchestrator, /knowledgeQAService\.buildCompletion/)
  assert.match(knowledgeQA, /similaritySearch\(standaloneQuestion,\s*5,\s*\{[\s\S]*tags:\s*context\.knowledgeTags,[\s\S]*knowledgeBaseIds:\s*context\.knowledgeBaseIds,[\s\S]*\}\)/)
  assert.match(workflowTypes, /knowledgeBaseIds\?:\s*string\[\]/)
  assert.match(workflowExecutor, /knowledgeBaseIds:\s*input\.knowledgeBaseIds/)
  assert.match(vectorStore, /knowledgeBaseIds\?:\s*string\[\]/)
  assert.match(vectorStore, /"knowledgeBaseId"\s*= ANY/)
})
