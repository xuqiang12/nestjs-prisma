const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('chat stream controller converts service errors into SSE error events', () => {
  const controller = readFileSync(join(rootDir, 'src/modules/knowledge-bot/chat/chat.controller.ts'), 'utf8')

  assert.match(controller, /catch\s*\(\s*error\s*\)/)
  assert.match(controller, /toStreamErrorEvent\(error\)/)
  assert.match(controller, /type:\s*'error'/)
  assert.match(controller, /SENSITIVE_WORD_BLOCKED/)
  assert.match(controller, /CHAT_STREAM_ERROR/)
  assert.match(controller, /res\.write\('data: \[DONE\]\\n\\n'\)/)
})

test('chat stream event type includes an explicit error event', () => {
  const service = readFileSync(join(rootDir, 'src/modules/knowledge-bot/chat/chat.service.ts'), 'utf8')

  assert.match(service, /\|\s*\{\s*type:\s*'error';\s*code:\s*string;\s*message:\s*string\s*\}/)
})
