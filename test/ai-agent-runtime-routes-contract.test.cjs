const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')
const read = (relativePath) => readFileSync(join(rootDir, relativePath), 'utf8')

test('agent runtime chat and conversation routes do not use knowledge-bot prefixes', () => {
  const chatController = read('src/modules/knowledge-bot/chat/chat.controller.ts')
  const conversationController = read('src/modules/knowledge-bot/conversation/conversation.controller.ts')

  assert.match(chatController, /@Controller\('agent\/chat'\)/)
  assert.doesNotMatch(chatController, /@Controller\('knowledge-bot\/chat'\)/)
  assert.match(conversationController, /@Controller\('agent\/conversation'\)/)
  assert.doesNotMatch(conversationController, /@Controller\('knowledge-bot\/conversation'\)/)
})
