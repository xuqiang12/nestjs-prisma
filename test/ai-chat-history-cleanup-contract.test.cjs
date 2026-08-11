// 校验 Agent 历史清理契约使用真实过滤规则。
const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert')

const root = path.resolve(__dirname, '..')
const conversationService = fs.readFileSync(path.join(root, 'src/modules/agent-chat/conversation/conversation.service.ts'), 'utf8')

test('chat history excludes assistant messages that leaked role template markers', () => {
  assert.match(conversationService, /isCleanAssistantHistoryContent/)
  assert.match(conversationService, /item\.role !== 'assistant' \|\| this\.isCleanAssistantHistoryContent\(item\.content\)/)
  assert.match(conversationService, /const ROLE_MARKER_PATTERN = \/\(\^\|\\n\)\\s\*\(user\|assistant\|system\)\\s\*\(\\n\|\$\)\/i/)
})
