// 校验 AI V2 工具注册和执行能力已经从 knowledge-bot/ai-engine 收敛到 ai-runtime。
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')
const assert = require('node:assert/strict')

const rootDir = join(__dirname, '..')

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

test('runtime tool registry and built-in tools live under ai-runtime', () => {
  const runtimeFiles = [
    'src/ai-runtime/tools/tool.types.ts',
    'src/ai-runtime/tools/runtime-tool-registry.service.ts',
    'src/ai-runtime/tools/default-tool.executor.ts',
    'src/ai-runtime/tools/builtin/search-knowledge.tool.ts',
    'src/ai-runtime/tools/builtin/get-user-menu-permissions.tool.ts',
  ]
  const legacyFiles = [
    'src/ai-engine/core/ai.registry.ts',
    'src/ai-engine/tools/tool.types.ts',
    'src/ai-engine/tools/tool.executor.ts',
    'src/modules/knowledge-bot/knowledge-bot.module.ts',
    'src/modules/knowledge-bot/ai/register.ts',
    'src/modules/knowledge-bot/ai/tools/search-knowledge.tool.ts',
    'src/modules/knowledge-bot/ai/tools/get-user-menu-permissions.tool.ts',
  ]

  for (const file of runtimeFiles) {
    assert.equal(existsSync(join(rootDir, file)), true, `${file} should exist`)
  }
  for (const file of legacyFiles) {
    assert.equal(existsSync(join(rootDir, file)), false, `${file} should be migrated away`)
  }
})

test('V2 runtime and management modules no longer import legacy tool registry', () => {
  const files = [
    'src/ai-runtime/tools/tool.types.ts',
    'src/ai-runtime/executor/handlers/tool.handler.ts',
    'src/ai-runtime/ai-runtime.module.ts',
    'src/ai-runtime/workflow/workflow-executor.service.ts',
    'src/modules/ai-platform/tool/tool.service.ts',
    'src/modules/ai-platform/agent/agent.service.ts',
    'src/modules/ai-platform/skill-package/skill-package.service.ts',
  ].map(read).join('\n')

  assert.doesNotMatch(files, /ai-engine\/core\/ai\.registry/)
  assert.doesNotMatch(files, /ai-engine\/tools\/tool\.executor/)
  assert.doesNotMatch(files, /ai-engine\/tools\/tool\.types/)
  assert.match(files, /RuntimeToolRegistry/)
  assert.match(files, /DefaultToolExecutor/)
  assert.doesNotMatch(files, /registerTool\(name/)
  assert.doesNotMatch(files, /void name/)
})

test('knowledge-bot is no longer loaded only to register AI tools', () => {
  const appModule = read('src/app.module.ts')
  const swaggerDocs = read('src/common/swagger/swagger-docs.ts')

  assert.doesNotMatch(appModule, /KnowledgeBotModule/)
  assert.doesNotMatch(swaggerDocs, /KnowledgeBotModule/)
})
