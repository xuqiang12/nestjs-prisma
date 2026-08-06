// 校验智能体运行时路由迁移后只保留新版入口。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')
const read = (relativePath) => readFileSync(join(rootDir, relativePath), 'utf8')

test('legacy knowledge-bot chat route is removed after stream v2 migration', () => {
  assert.equal(existsSync(join(rootDir, 'src/modules/knowledge-bot/chat/chat.controller.ts')), false)
  assert.equal(existsSync(join(rootDir, 'src/modules/knowledge-bot/chat/chat.service.ts')), false)
  assert.equal(existsSync(join(rootDir, 'src/modules/knowledge-bot/chat/dto/chat.dto.ts')), false)
})

test('agent conversation routes stay available without knowledge-bot prefixes', () => {
  const conversationController = read('src/modules/agent-chat/conversation/conversation.controller.ts')
  const agentChatModule = read('src/modules/agent-chat/agent-chat.module.ts')

  assert.match(conversationController, /@Controller\('agent\/conversation'\)/)
  assert.doesNotMatch(conversationController, /@Controller\('knowledge-bot\/conversation'\)/)
  assert.match(agentChatModule, /ConversationController/)
  assert.match(agentChatModule, /ConversationService/)
  assert.equal(existsSync(join(rootDir, 'src/modules/knowledge-bot/knowledge-bot.module.ts')), false)
  assert.equal(existsSync(join(rootDir, 'src/modules/knowledge-bot/conversation/conversation.controller.ts')), false)
  assert.equal(existsSync(join(rootDir, 'src/modules/knowledge-bot/conversation/conversation.service.ts')), false)
  assert.equal(existsSync(join(rootDir, 'src/modules/knowledge-bot/conversation/dto/conversation.dto.ts')), false)
})
