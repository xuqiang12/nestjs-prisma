// 校验智能体提示词快照在新版运行时上下文中生效。
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('agent prompt snapshot is the editable prompt content used at runtime', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')
  const contextBuilder = readFileSync(join(rootDir, 'src/ai-runtime/context/agent-context.builder.ts'), 'utf8')
  const contextTypes = readFileSync(join(rootDir, 'src/ai-runtime/context/agent-context.types.ts'), 'utf8')

  assert.match(service, /data\.promptSnapshot = await this\.resolvePromptSnapshot\(promptId,\s*dto\.promptSnapshot\)/)
  assert.doesNotMatch(contextBuilder, /joinPrompt\(basePrompt,\s*agent\.promptEnhancement\)/)
  assert.match(contextBuilder, /agent\.promptSnapshot \|\| prompt\.content/)
  assert.match(contextBuilder, /agent\.promptEnhancement/)
  assert.doesNotMatch(contextTypes, /promptEnhancement\?:\s*string/)
})

test('prompt update syncs enabled agent prompt snapshots', () => {
  const promptService = readFileSync(join(rootDir, 'src/modules/ai-config/prompt/prompt.service.ts'), 'utf8')

  assert.match(promptService, /await this\.syncAgentPromptSnapshots\(dto\.id,\s*dto\.content\)/)
  assert.match(promptService, /promptSyncEnabled:\s*true/)
  assert.match(promptService, /promptSnapshot:\s*content/)
})
