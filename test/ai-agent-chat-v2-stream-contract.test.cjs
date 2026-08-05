// 校验新版智能体流式入口的静态合同。
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

test('agent chat v2 stream route is registered from the new module', () => {
  const appModule = readSource('src/app.module.ts')
  const featureModule = readSource('src/modules/agent-chat/agent-chat.module.ts')
  const controller = readSource('src/modules/agent-chat/stream/agent-stream.controller.ts')

  assert.match(appModule, /import \{ AgentChatModule \} from '\.\/modules\/agent-chat\/agent-chat\.module'/)
  assert.match(appModule, /\bAgentChatModule\b/)
  assert.match(featureModule, /AgentStreamController/)
  assert.match(featureModule, /AgentStreamService/)
  assert.match(controller, /@Controller\('agent\/chat'\)/)
  assert.match(controller, /@Post\('stream-v2'\)/)
  assert.doesNotMatch(controller, /knowledge-bot/)
  assert.doesNotMatch(controller, /ChatService/)
  assert.doesNotMatch(controller, /AgentRuntimeService/)
  assert.doesNotMatch(controller, /AgentPlanService/)
  assert.doesNotMatch(controller, /AgentExecutorService/)
})

test('agent chat v2 request DTO keeps agentCode required and conversationId optional', () => {
  const dto = readSource('src/modules/agent-chat/stream/dto/agent-stream.dto.ts')
  const agentCodeIndex = dto.indexOf('agentCode: string')
  const beforeAgentCode = dto.slice(Math.max(0, agentCodeIndex - 180), agentCodeIndex)

  assert.match(dto, /agentCode: string/)
  assert.match(beforeAgentCode, /@IsString\(\)/)
  assert.match(dto, /message: string/)
  assert.match(dto, /conversationId\?: string/)
  assert.doesNotMatch(beforeAgentCode, /@IsOptional/)
})

test('agent event envelope covers current frontend stream semantics', () => {
  const eventTypes = readSource('src/ai-runtime/events/agent-event.types.ts')

  assert.match(eventTypes, /type: 'content'/)
  assert.match(eventTypes, /type: 'sources'/)
  assert.match(eventTypes, /type: 'error'/)
  assert.match(eventTypes, /type: 'done'/)
  assert.match(eventTypes, /workflow_\$\{string\}/)
  assert.match(eventTypes, /payload/)
  assert.match(eventTypes, /metadata/)
})

test('sse adapter only converts AgentEvent to SSE data', () => {
  const adapter = readSource('src/ai-runtime/adapter/sse-event.adapter.ts')

  assert.match(adapter, /toSseData\(event: AgentEvent\)/)
  assert.match(adapter, /event\.type === 'done'/)
  assert.match(adapter, /data: \[DONE\]\\n\\n/)
  assert.match(adapter, /JSON\.stringify\(event\)/)
  assert.doesNotMatch(adapter, /ChatService/)
  assert.doesNotMatch(adapter, /AgentRuntimeService/)
  assert.doesNotMatch(adapter, /express/)
})

test('v2 stream service delegates real v2 chat flow and keeps entrance errors explicit', () => {
  const service = readSource('src/modules/agent-chat/stream/agent-stream.service.ts')

  assert.match(service, /AGENT_CODE_REQUIRED/)
  assert.match(service, /agentCode is required for agent chat v2 stream/)
  assert.match(service, /AgentChatService/)
  assert.match(service, /agentChatService\.stream\(body as AgentStreamRequestDto, userId, metadata\)/)
  assert.match(service, /AGENT_CHAT_V2_USER_REQUIRED/)
  assert.doesNotMatch(service, /AGENT_CHAT_V2_NOT_IMPLEMENTED/)
  assert.match(service, /yield \{ type: 'done'/)
})

test('v2 stream controller only sets SSE headers and delegates event production', () => {
  const controller = readSource('src/modules/agent-chat/stream/agent-stream.controller.ts')

  assert.match(controller, /Content-Type', 'text\/event-stream; charset=utf-8'/)
  assert.match(controller, /Cache-Control', 'no-cache'/)
  assert.match(controller, /Connection', 'keep-alive'/)
  assert.match(controller, /@Req\(\) req: AuthenticatedRequest/)
  assert.match(controller, /agentStreamService\.stream\(body, req\.user\.userId\)/)
  assert.match(controller, /sseEventAdapter\.toSseData\(event\)/)
  assert.match(controller, /res\.end\(\)/)
  assert.doesNotMatch(controller, /LlmService/)
  assert.doesNotMatch(controller, /VectorStoreService/)
  assert.doesNotMatch(controller, /WorkflowRuntimeService/)
})
