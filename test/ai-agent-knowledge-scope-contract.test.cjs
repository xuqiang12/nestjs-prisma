// 校验智能体知识标签会进入知识库检索范围。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('ai agent stores knowledge tag scope', () => {
  const schema = readFileSync(join(rootDir, 'prisma/schema.prisma'), 'utf8')
  const dto = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/dto/agent.dto.ts'), 'utf8')
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')
  const migration = join(rootDir, 'prisma/migrations/20260729040000_add_ai_agent_knowledge_tags/migration.sql')
  const restoreMigration = join(rootDir, 'prisma/migrations/20260730000000_restore_ai_agent_knowledge_tags/migration.sql')

  assert.match(schema, /knowledgeTags\s+Json\?/)
  assert.match(dto, /knowledgeTags\?:\s*string\[\]/)
  assert.match(service, /knowledgeTags:\s*true/)
  assert.match(service, /knowledgeTags:\s*dto\.knowledgeTags as Prisma\.InputJsonValue/)
  assert.ok(existsSync(migration), 'migration should add agent knowledge tag scope')
  assert.ok(existsSync(restoreMigration), 'migration should restore agent knowledge tag scope after prompt policy change')
})

test('agent runtime passes knowledge tags into rag and workflow searches', () => {
  const contextTypes = readFileSync(join(rootDir, 'src/ai-runtime/context/agent-context.types.ts'), 'utf8')
  const contextBuilder = readFileSync(join(rootDir, 'src/ai-runtime/context/agent-context.builder.ts'), 'utf8')
  const ragHandler = readFileSync(join(rootDir, 'src/ai-runtime/executor/handlers/rag.handler.ts'), 'utf8')
  const knowledgeQA = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-qa.service.ts'), 'utf8')
  const workflowTypes = readFileSync(join(rootDir, 'src/ai-runtime/workflow/workflow.types.ts'), 'utf8')
  const workflowExecutor = readFileSync(join(rootDir, 'src/ai-runtime/workflow/workflow-executor.service.ts'), 'utf8')
  const vectorStore = readFileSync(join(rootDir, 'src/ai-runtime/vector/vector-store.service.ts'), 'utf8')

  assert.match(contextTypes, /knowledgeTags:\s*string\[\]/)
  assert.match(contextBuilder, /knowledgeTags:\s*Array\.isArray\(agent\.knowledgeTags\)[\s\S]*agent\.knowledgeTags\.filter/)
  assert.match(ragHandler, /knowledgeTags:\s*context\.capabilities\.knowledgeTags/)
  assert.match(knowledgeQA, /tags:\s*context\.knowledgeTags/)
  assert.match(knowledgeQA, /similaritySearch\(standaloneQuestion,\s*5,\s*\{[\s\S]*tags:\s*context\.knowledgeTags,[\s\S]*knowledgeBaseIds:\s*context\.knowledgeBaseIds,[\s\S]*\}\)/)
  assert.match(workflowTypes, /knowledgeTags\?:\s*string\[\]/)
  assert.match(workflowExecutor, /similaritySearch\(standaloneQuestion,\s*config\.limit \? Number\(config\.limit\) : 5,\s*\{\s*tags:\s*input\.knowledgeTags,\s*knowledgeBaseIds:\s*input\.knowledgeBaseIds\s*\}\)/)
  assert.match(vectorStore, /type SearchOptions = \{\s*tags\?: string\[\]\s*knowledgeBaseIds\?: string\[\]/)
  assert.match(vectorStore, /metadata->'tags'/)
  assert.match(vectorStore, /\?\|/)
})
