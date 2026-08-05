const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { dirname, join } = require('node:path')
const { test } = require('node:test')

const backendRoot = join(__dirname, '..')
const workspaceRoot = dirname(backendRoot)

const readBackend = (path) => readFileSync(join(backendRoot, path), 'utf8')
const readWorkspace = (path) => readFileSync(join(workspaceRoot, path), 'utf8')

test('prompt management is exposed through ai-config without moving the Vue page', () => {
  const controllerPath = 'src/modules/ai-config/prompt/prompt.controller.ts'
  const servicePath = 'src/modules/ai-config/prompt/prompt.service.ts'
  const dtoPath = 'src/modules/ai-config/prompt/dto/prompt.dto.ts'

  assert.equal(existsSync(join(backendRoot, controllerPath)), true)
  assert.equal(existsSync(join(backendRoot, servicePath)), true)
  assert.equal(existsSync(join(backendRoot, dtoPath)), true)
  assert.equal(existsSync(join(backendRoot, 'src/modules/ai-platform/prompt')), false)

  const controller = readBackend(controllerPath)
  const service = readBackend(servicePath)
  const module = readBackend('src/modules/ai-config/ai-config.module.ts')
  const aiPlatformModule = readBackend('src/modules/ai-platform/ai-platform.module.ts')
  const api = readWorkspace('fullstack-admin-serve/vue-element-admin-dev/src/api/ai.js')
  const menuSeed = readBackend('prisma/seeds/menu.ts')

  assert.match(controller, /@Controller\('ai-config\/prompt'\)/)
  assert.match(controller, /PromptService/)
  assert.match(module, /PromptController/)
  assert.match(module, /PromptService/)
  assert.match(service, /nextPromptCode/)
  assert.doesNotMatch(controller, /ai-platform\/prompt/)
  assert.doesNotMatch(module, /AiPlatformModule/)
  assert.doesNotMatch(aiPlatformModule, /PromptController/)
  assert.doesNotMatch(aiPlatformModule, /PromptService/)

  assert.match(api, /\/ai-config\/prompt\/list/)
  assert.match(api, /\/ai-config\/prompt\/detail/)
  assert.match(api, /\/ai-config\/prompt`/)
  assert.match(api, /\/ai-config\/prompt\/update/)
  assert.match(api, /\/ai-config\/prompt\/status/)
  assert.match(api, /\/ai-config\/prompt\/delete/)
  assert.doesNotMatch(api, /\/ai-platform\/prompt/)

  assert.match(menuSeed, /path:\s*'\/AIEngine\/prompt\/index'/)
  assert.match(menuSeed, /component:\s*'\/AIEngine\/prompt\/index'/)
})
