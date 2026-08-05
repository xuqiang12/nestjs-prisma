const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { dirname, join } = require('node:path')
const { test } = require('node:test')

const backendRoot = join(__dirname, '..')
const workspaceRoot = dirname(backendRoot)

const readBackend = (path) => readFileSync(join(backendRoot, path), 'utf8')
const readWorkspace = (path) => readFileSync(join(workspaceRoot, path), 'utf8')

test('sensitive-word config management moves from ai-platform to ai-config', () => {
  const controllerPath = 'src/modules/ai-config/sensitive-word/sensitive-word.controller.ts'
  const servicePath = 'src/modules/ai-config/sensitive-word/sensitive-word.service.ts'
  const dtoPath = 'src/modules/ai-config/sensitive-word/dto/sensitive-word.dto.ts'
  const modulePath = 'src/modules/ai-config/ai-config.module.ts'

  assert.equal(existsSync(join(backendRoot, controllerPath)), true)
  assert.equal(existsSync(join(backendRoot, servicePath)), true)
  assert.equal(existsSync(join(backendRoot, dtoPath)), true)
  assert.equal(existsSync(join(backendRoot, modulePath)), true)
  assert.equal(existsSync(join(backendRoot, 'src/modules/ai-platform/sensitive-word')), false)

  const controller = readBackend(controllerPath)
  const module = readBackend(modulePath)
  const appModule = readBackend('src/app.module.ts')
  const aiPlatformModule = readBackend('src/modules/ai-platform/ai-platform.module.ts')
  const metadata = readBackend('src/metadata.ts')

  assert.match(controller, /@Controller\('ai-config\/sensitive-word'\)/)
  assert.match(module, /SensitiveWordController/)
  assert.match(module, /SensitiveWordService/)
  assert.match(appModule, /AiConfigModule/)
  assert.doesNotMatch(aiPlatformModule, /SensitiveWord/)
  assert.match(metadata, /modules\/ai-config\/sensitive-word/)
  assert.doesNotMatch(metadata, /modules\/ai-platform\/sensitive-word/)
})

test('Vue2 sensitive-word page calls the ai-config API only', () => {
  const api = readWorkspace('fullstack-admin-serve/vue-element-admin-dev/src/api/ai.js')

  assert.match(api, /\/ai-config\/sensitive-word\/list/)
  assert.match(api, /\/ai-config\/sensitive-word\/detail/)
  assert.match(api, /\/ai-config\/sensitive-word`/)
  assert.match(api, /\/ai-config\/sensitive-word\/update/)
  assert.match(api, /\/ai-config\/sensitive-word\/status/)
  assert.doesNotMatch(api, /\/ai-platform\/sensitive-word/)
})

test('migration risks document records deferred cleanup and runtime safety risks', () => {
  const doc = readBackend('doc/code/AIEngine/agent-runtime-rebuild-migration-risks.md')

  assert.match(doc, /\/ai-platform\/sensitive-word/)
  assert.match(doc, /测试完成后/)
  assert.match(doc, /删除旧/)
  assert.match(doc, /流式输出/)
  assert.match(doc, /yield event/)
})
