// 用接口模拟验证新版智能体流式对话从用户问题到落库的第七步合同。
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

// 加载新版智能体流式闭环相关运行时类用于接口模拟。
function loadRuntime() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return {
    ...require(join(rootDir, 'src/ai-runtime/agent-runtime.service')),
    ...require(join(rootDir, 'src/ai-runtime/composer/agent-composer.service')),
    ...require(join(rootDir, 'src/ai-runtime/trace/agent-trace.service')),
    ...require(join(rootDir, 'src/modules/agent-chat/chat/agent-chat.service')),
    ...require(join(rootDir, 'src/modules/agent-chat/stream/agent-stream.service')),
  }
}

// 构造运行时统一请求的基础测试数据。
function createRequest() {
  return {
    message: { content: '企业版价格是多少？' },
    agent: { code: 'customer_service' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    stream: { enabled: true },
    metadata: {
      requestId: 'req-1',
      channel: 'agent-chat-v2',
      source: 'stream-v2',
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
    },
  }
}

// 构造新版智能体运行时上下文的基础测试数据。
function createContext() {
  return {
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    history: [],
    request: createRequest(),
    prompt: { id: 'prompt-1', system: '你是客服智能体。' },
    model: { model: 'mock-model', baseUrl: 'http://mock.local', apiKey: 'mock-key' },
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: true,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: ['search_knowledge'],
    },
    execution: { stream: true, maxSteps: 1 },
    metadata: createRequest().metadata,
  }
}

// 收集异步事件流中的所有事件用于断言。
async function collect(iterable) {
  const events = []
  for await (const event of iterable) {
    events.push(event)
  }
  return events
}

test('AgentRuntimeService runs context, capability, planner, validator, executor and trace in order', async () => {
  const { AgentRuntimeService, AgentComposer } = loadRuntime()
  const calls = []
  const context = createContext()
  const plan = {
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'rag', input: { query: '企业版价格是多少？' } }],
  }
  const runtime = new AgentRuntimeService(
    { build: async () => { calls.push('context'); return context } },
    { resolve: () => { calls.push('capability'); return { plannerView: ['chat', 'rag'], diagnosticView: [] } } },
    { plan: () => { calls.push('planner'); return plan } },
    { validate: () => { calls.push('validator'); return plan } },
    {
      execute: async function* () {
        calls.push('executor')
        yield { type: 'content', payload: { text: '企业版价格为4999元/年。' }, metadata: { requestId: 'req-1' } }
        yield { type: 'sources', payload: { sources: [{ id: 'doc-price' }] }, metadata: { requestId: 'req-1' } }
      },
    },
    new AgentComposer(),
    {
      start: async () => { calls.push('trace_start'); return { id: 'log-1' } },
      finish: async () => { calls.push('trace_finish') },
      fail: async () => { calls.push('trace_fail') },
    },
  )

  const events = await collect(runtime.stream(createRequest()))

  assert.deepEqual(calls, ['context', 'capability', 'planner', 'validator', 'trace_start', 'executor', 'trace_finish'])
  assert.deepEqual(events.map((event) => event.type), ['plan', 'content', 'sources'])
  assert.equal(events[1].payload.text, '企业版价格为4999元/年。')
})

test('AgentChatService checks safety, persists messages and keeps knowledge price answer for customer agent', async () => {
  const { AgentChatService, AgentComposer } = loadRuntime()
  const calls = []
  const repository = {
    getOrCreateConversation: async (userId, agentCode, message, conversationId) => {
      calls.push(['conversation', userId, agentCode, message, conversationId])
      return { id: conversationId || 'conv-created' }
    },
    saveMessage: async (message) => {
      calls.push(['message', message.role, message.content, message.sources, message.promptId, message.workflowCode])
      return { id: `${message.role}-message` }
    },
    touchConversation: async (conversationId) => calls.push(['touch', conversationId]),
  }
  const safety = {
    checkAndApply: async (content, scope) => {
      calls.push(['safety', scope, content])
      return { content, hits: [] }
    },
  }
  const runtime = {
    stream: async function* () {
      yield {
        type: 'plan',
        payload: { plan: { steps: [{ capability: 'rag' }] }, plannerView: ['chat', 'rag'] },
        metadata: { requestId: 'req-1', promptId: 'prompt-1', workflowCode: 'workflow-price' },
      }
      yield {
        type: 'content',
        payload: { text: '企业版价格为4999元/年。' },
        metadata: { requestId: 'req-1', capability: 'rag' },
      }
      yield {
        type: 'sources',
        payload: { sources: [{ id: 'doc-price', content: '企业版价格为4999元/年。' }] },
        metadata: { requestId: 'req-1', capability: 'rag' },
      }
    },
  }
  const service = new AgentChatService(safety, repository, runtime, new AgentComposer())
  const events = await collect(service.stream({
    agentCode: 'customer_service',
    message: '企业版价格是多少？',
    conversationId: 'conv-1',
  }, 'user-1'))

  assert.deepEqual(events.map((event) => event.type), ['plan', 'content', 'sources'])
  assert.equal(events[1].payload.text, '企业版价格为4999元/年。')
  assert.deepEqual(calls.map((item) => item[0]), ['safety', 'conversation', 'message', 'safety', 'message', 'touch'])
  assert.deepEqual(calls[2], ['message', 'user', '企业版价格是多少？', undefined, undefined, undefined])
  assert.deepEqual(calls[4], [
    'message',
    'assistant',
    '企业版价格为4999元/年。',
    [{ id: 'doc-price', content: '企业版价格为4999元/年。' }],
    'prompt-1',
    'workflow-price',
  ])
})

test('AgentStreamService starts from user request and always emits done', async () => {
  const { AgentStreamService } = loadRuntime()
  const chatService = {
    stream: async function* (body, userId, metadata) {
      assert.equal(userId, 'user-1')
      assert.match(metadata.requestId, /^agent-chat-v2-/)
      yield { type: 'content', payload: { text: body.message }, metadata: { requestId: metadata.requestId } }
      throw new Error('runtime failed')
    },
  }
  const service = new AgentStreamService(chatService)
  const events = await collect(service.stream({
    agentCode: 'customer_service',
    message: '你好',
    conversationId: 'conv-1',
  }, 'user-1'))

  assert.deepEqual(events.map((event) => event.type), ['content', 'error', 'done'])
  assert.equal(events[0].metadata.requestId, events[1].metadata.requestId)
  assert.equal(events[1].metadata.requestId, events[2].metadata.requestId)
})

test('ConversationRepository owns v2 conversation and message persistence boundaries', () => {
  const repository = readSource('src/modules/agent-chat/persistence/conversation.repository.ts')

  assert.match(repository, /getOrCreateConversation\(userId: string, agentCode: string, message: string, conversationId\?: string/)
  assert.match(repository, /where: \{ id: conversationId, isDeleted: false \}/)
  assert.match(repository, /conversation\.userId !== userId/)
  assert.match(repository, /saveMessage\(/)
  assert.match(repository, /touchConversation\(/)
  assert.doesNotMatch(repository, /ConversationService|ChatService/)
})

test('Agent chat v2 flow files keep new runtime boundary and do not revive old services', () => {
  const files = [
    'src/ai-runtime/agent-runtime.service.ts',
    'src/ai-runtime/trace/agent-trace.service.ts',
    'src/modules/agent-chat/chat/agent-chat.service.ts',
    'src/modules/agent-chat/stream/agent-stream.service.ts',
    'src/modules/agent-chat/stream/agent-stream.controller.ts',
  ].map(readSource).join('\n')

  assert.match(files, /class AgentRuntimeService/)
  assert.match(files, /class AgentChatService/)
  assert.match(files, /class AgentTraceService/)
  assert.doesNotMatch(files, /modules\/knowledge-bot|AgentPlanService|AgentExecutorService|from '\.\/chat\.service'|new ChatService/)
  assert.doesNotMatch(files, /prisma\\schema|migrate|seed/)
})
