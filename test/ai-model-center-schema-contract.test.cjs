const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
const schema = fs.readFileSync(schemaPath, 'utf8')

test('ai model center schema exists and keeps Agent legacy model compatibility', () => {
  assert.match(schema, /model AiModelProvider\s*{[\s\S]*code\s+String\s+@unique[\s\S]*baseUrl\s+String[\s\S]*apiKeyEnv\s+String/)
  assert.match(schema, /model AiModelConfig\s*{[\s\S]*providerId\s+String[\s\S]*modelName\s+String[\s\S]*modelType\s+String[\s\S]*capabilities\s+Json\?/)
  assert.match(schema, /model AiModelConfig\s*{[\s\S]*isDefault\s+Boolean\s+@default\(false\)/)
  assert.match(schema, /@@index\(\[modelType,\s*isDefault,\s*status\]\)/)
  assert.match(schema, /model AiAgent\s*{[\s\S]*model\s+String\?/)
  assert.match(schema, /model AiAgent\s*{[\s\S]*modelConfigId\s+String\?/)
  assert.match(schema, /model AiAgent\s*{[\s\S]*modelConfig\s+AiModelConfig\?/)
})
