const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('ai agent stores product-facing display fields', () => {
  const schema = readFileSync(join(rootDir, 'prisma/schema.prisma'), 'utf8')
  const dto = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/dto/agent.dto.ts'), 'utf8')
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')
  const migration = join(rootDir, 'prisma/migrations/20260729030000_add_ai_agent_display_fields/migration.sql')

  assert.match(schema, /avatar\s+String\?/)
  assert.match(schema, /welcomeMessage\s+String\?/)
  assert.match(schema, /recommendedQuestions\s+Json\?/)
  assert.match(schema, /tags\s+Json\?/)
  assert.match(dto, /avatar\?:\s*string/)
  assert.match(dto, /welcomeMessage\?:\s*string/)
  assert.match(dto, /recommendedQuestions\?:\s*string\[\]/)
  assert.match(dto, /tags\?:\s*string\[\]/)
  assert.match(service, /avatar:\s*dto\.avatar/)
  assert.match(service, /welcomeMessage:\s*dto\.welcomeMessage/)
  assert.match(service, /recommendedQuestions:\s*dto\.recommendedQuestions as Prisma\.InputJsonValue/)
  assert.match(service, /tags:\s*dto\.tags as Prisma\.InputJsonValue/)
  assert.ok(existsSync(migration), 'migration should add agent display fields')
})

test('enabled agent options expose display fields for admin chat empty state', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')

  assert.match(service, /avatar:\s*true/)
  assert.match(service, /welcomeMessage:\s*true/)
  assert.match(service, /recommendedQuestions:\s*true/)
  assert.match(service, /tags:\s*true/)
})
