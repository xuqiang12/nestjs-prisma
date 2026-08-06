// 校验新版智能体对话完成迁移后旧运行链路已清理。
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')
const assert = require('node:assert/strict')

const rootDir = join(__dirname, '..')
const read = (relativePath) => readFileSync(join(rootDir, relativePath), 'utf8')

test('legacy knowledge-bot chat entry and legacy ai-engine agent chain are gone', () => {
  [
    'src/modules/knowledge-bot/chat',
    'src/ai-engine/agent/agent-runtime.service.ts',
    'src/ai-engine/agent/agent-runtime.types.ts',
    'src/ai-engine/agent/agent-plan.service.ts',
    'src/ai-engine/agent/agent-executor.service.ts',
    'src/ai-engine/agent/agent-response-composer.service.ts',
    'src/ai-engine/agent/agent-execution-logger.service.ts',
  ].forEach((relativePath) => {
    assert.equal(existsSync(join(rootDir, relativePath)), false, `${relativePath} should be removed`)
  })
})

test('AiRuntimeModule no longer registers legacy agent providers', () => {
  const module = read('src/ai-runtime/ai-runtime.module.ts')

  assert.equal(existsSync(join(rootDir, 'src/ai-engine')), false)
  assert.doesNotMatch(module, /agent\/agent-runtime\.service/)
  assert.doesNotMatch(module, /AgentPlanService/)
  assert.doesNotMatch(module, /AgentExecutorService/)
  assert.doesNotMatch(module, /AgentResponseComposerService/)
  assert.doesNotMatch(module, /AgentExecutionLoggerService/)
})

test('AgentChatModule is the remaining agent chat stream runtime', () => {
  const appModule = read('src/app.module.ts')
  const agentChatModule = read('src/modules/agent-chat/agent-chat.module.ts')
  const streamController = read('src/modules/agent-chat/stream/agent-stream.controller.ts')

  assert.match(appModule, /AgentChatModule/)
  assert.match(agentChatModule, /AgentStreamController/)
  assert.match(agentChatModule, /AgentRuntimeService/)
  assert.match(streamController, /@Post\('stream'\)/)
  assert.doesNotMatch(streamController, /stream-v2|streamV2/)
})
