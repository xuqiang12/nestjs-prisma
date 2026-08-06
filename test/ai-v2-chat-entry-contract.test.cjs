// 校验 V2 普通聊天入口只承担普通对话边界。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

// 读取指定源码文件内容用于静态合同断言。
function readSource(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  assert.equal(existsSync(absolutePath), true, `${relativePath} should exist`)
  return readFileSync(absolutePath, 'utf8')
}

test('ordinary chat route is registered from src/modules/chat', () => {
  const appModule = readSource('src/app.module.ts')
  const swaggerDocs = readSource('src/common/swagger/swagger-docs.ts')
  const chatModule = readSource('src/modules/chat/chat.module.ts')
  const controller = readSource('src/modules/chat/chat.controller.ts')

  assert.match(appModule, /import \{ ChatModule \} from '\.\/modules\/chat\/chat\.module'/)
  assert.match(appModule, /\bChatModule\b/)
  assert.match(swaggerDocs, /import \{ ChatModule \} from '..\/..\/modules\/chat\/chat\.module'/)
  assert.match(swaggerDocs, /modules: \[ChatModule, AgentChatModule/)
  assert.match(chatModule, /controllers: \[ChatController\]/)
  assert.match(chatModule, /providers: \[ChatService, ChatConversationRepository\]/)
  assert.match(controller, /@Controller\('chat'\)/)
  assert.match(controller, /@Post\(\)/)
  assert.doesNotMatch(controller, /agent\/chat|stream-v2|AgentStream|AgentRuntime/)
})

test('ordinary chat request dto does not carry agent or knowledge routing fields', () => {
  const dto = readSource('src/modules/chat/dto/chat.dto.ts')

  assert.match(dto, /message: string/)
  assert.match(dto, /conversationId\?: string/)
  assert.doesNotMatch(dto, /agentCode|mode|knowledgeEnabled|toolCodes|workflowCode|knowledgeBaseIds/)
})

test('ordinary chat service uses only model chat and safety dependencies', () => {
  const service = readSource('src/modules/chat/chat.service.ts')
  const repository = readSource('src/modules/chat/persistence/chat-conversation.repository.ts')
  const combined = `${service}\n${repository}`

  assert.match(service, /ModelResolverService/)
  assert.match(service, /LlmService/)
  assert.match(service, /SensitiveWordCheckerService/)
  assert.match(repository, /mode: 'chat'/)
  assert.doesNotMatch(combined, /AgentRuntimeService|AgentPlanner|AgentPlanValidator|KnowledgeQAService/)
  assert.doesNotMatch(combined, /VectorStoreService|DefaultToolExecutor|WorkflowRuntimeService/)
  assert.doesNotMatch(combined, /agentCode|knowledgeEnabled|toolCodes|workflowCode|knowledgeBaseIds/)
})
