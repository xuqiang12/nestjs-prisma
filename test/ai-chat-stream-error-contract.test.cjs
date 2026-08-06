// 校验新版智能体流式入口把错误转成 SSE 事件并正常结束。
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('agent stream service converts runtime errors into SSE error events', () => {
  const service = readFileSync(join(rootDir, 'src/modules/agent-chat/stream/agent-stream.service.ts'), 'utf8')

  assert.match(service, /catch\s*\(\s*error\s*\)/)
  assert.match(service, /type:\s*'error'/)
  assert.match(service, /AGENT_CHAT_V2_ERROR/)
  assert.match(service, /yield \{ type: 'done'/)
})

test('agent stream controller keeps SSE protocol boundary only', () => {
  const controller = readFileSync(join(rootDir, 'src/modules/agent-chat/stream/agent-stream.controller.ts'), 'utf8')

  assert.match(controller, /@Post\('stream'\)/)
  assert.doesNotMatch(controller, /stream-v2|streamV2/)
  assert.match(controller, /text\/event-stream/)
  assert.match(controller, /sseEventAdapter\.toSseData\(event\)/)
  assert.doesNotMatch(controller, /toStreamErrorEvent/)
})
