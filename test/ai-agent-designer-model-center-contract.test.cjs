const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('agent config options use database model options instead of hardcoded model list', () => {
  const agentService = read('src/modules/ai-platform/agent/agent.service.ts')
  const dto = read('src/modules/ai-platform/agent/dto/agent.dto.ts')

  assert.doesNotMatch(agentService, /const MODEL_OPTIONS\s*=/)
  assert.match(agentService, /aiModelConfig\.findMany/)
  assert.match(agentService, /modelConfigId/)
  assert.match(dto, /modelConfigId\?: string/)
  assert.match(agentService, /data\.modelConfigId\s*=\s*dto\.modelConfigId/)
})
