const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('agent prompt snapshot is the editable prompt content used at runtime', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')
  const runtimeService = readFileSync(join(rootDir, 'src/ai-engine/agent/agent-runtime.service.ts'), 'utf8')
  const runtimeTypes = readFileSync(join(rootDir, 'src/ai-engine/agent/agent-runtime.types.ts'), 'utf8')

  assert.match(service, /data\.promptSnapshot = await this\.resolvePromptSnapshot\(promptId,\s*dto\.promptSnapshot\)/)
  assert.doesNotMatch(runtimeService, /joinPrompt\(basePrompt,\s*agent\.promptEnhancement\)/)
  assert.match(runtimeService, /const basePrompt = agent\.promptSnapshot \|\| prompt\.content/)
  assert.doesNotMatch(runtimeTypes, /promptEnhancement\?:\s*string/)
})

test('prompt update syncs enabled agent prompt snapshots', () => {
  const promptService = readFileSync(join(rootDir, 'src/modules/ai-platform/prompt/prompt.service.ts'), 'utf8')

  assert.match(promptService, /await this\.syncAgentPromptSnapshots\(dto\.id,\s*dto\.content\)/)
  assert.match(promptService, /promptSyncEnabled:\s*true/)
  assert.match(promptService, /promptSnapshot:\s*content/)
})
