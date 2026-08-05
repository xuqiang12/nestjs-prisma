// 用接口模拟验证新版智能体事件汇总和 SSE 适配的第六步合同。
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

// 加载事件汇总和 SSE 适配相关运行时类用于接口模拟。
function loadRuntime() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return {
    ...require(join(rootDir, 'src/ai-runtime/composer/agent-composer.service')),
    ...require(join(rootDir, 'src/ai-runtime/adapter/sse-event.adapter')),
  }
}

// 构造事件汇总合同测试所需的智能体上下文。
function createContext() {
  return {
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    history: [],
    request: {
      message: { content: '企业版多少钱？' },
      agent: { code: 'customer_service' },
      user: { id: 'user-1' },
      conversation: { id: 'conv-1' },
      stream: { enabled: true },
      metadata: {
        requestId: 'req-1',
        channel: 'test',
        source: 'contract',
        createdAt: new Date('2026-08-05T00:00:00.000Z'),
      },
    },
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
    metadata: {
      requestId: 'req-1',
      channel: 'test',
      source: 'contract',
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
    },
  }
}

test('AgentEvent types include plan and tool events with protocol independent envelope', () => {
  const eventTypes = readSource('src/ai-runtime/events/agent-event.types.ts')

  assert.match(eventTypes, /^\/\/ 定义新版智能体运行时的协议无关事件结构。/)
  assert.match(eventTypes, /type: 'plan'/)
  assert.match(eventTypes, /type: 'tool_start' \| 'tool_done'/)
  assert.match(eventTypes, /payload/)
  assert.match(eventTypes, /metadata/)
  assert.doesNotMatch(eventTypes, /Express|Response|text\/event-stream/)
})

test('AgentComposer creates plan, error and done events without SSE coupling', () => {
  const { AgentComposer } = loadRuntime()
  const composer = new AgentComposer()
  const context = createContext()
  const plan = {
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'rag', input: { query: '企业版多少钱？' } }],
  }

  const planEvent = composer.createPlanEvent(plan, ['chat', 'rag'], context)
  const errorEvent = composer.createErrorEvent(new Error('测试错误'), context)
  const doneEvent = composer.createDoneEvent(context)

  assert.equal(planEvent.type, 'plan')
  assert.deepEqual(planEvent.payload.plan, plan)
  assert.deepEqual(planEvent.payload.plannerView, ['chat', 'rag'])
  assert.equal(errorEvent.type, 'error')
  assert.deepEqual(errorEvent.payload, { code: 'AGENT_CHAT_V2_ERROR', message: '测试错误' })
  assert.equal(doneEvent.type, 'done')
})

test('AgentComposer summarizes assistant content and sources from AgentEvents', () => {
  const { AgentComposer } = loadRuntime()
  const composer = new AgentComposer()

  const result = composer.collectAssistantResult([
    { type: 'content', payload: { text: '企业版价格' }, metadata: {} },
    { type: 'content', payload: { text: '为4999元/年。' }, metadata: {} },
    { type: 'sources', payload: { sources: [{ id: 'doc-price' }] }, metadata: {} },
    { type: 'tool_done', payload: { tool: { code: 'weather', result: {} } }, metadata: {} },
  ])

  assert.equal(result.answer, '企业版价格为4999元/年。')
  assert.deepEqual(result.sources, [{ id: 'doc-price' }])
})

test('SseEventAdapter serializes new plan and tool events while done remains DONE sentinel', () => {
  const { SseEventAdapter } = loadRuntime()
  const adapter = new SseEventAdapter()

  const planData = adapter.toSseData({
    type: 'plan',
    payload: { plan: { steps: [] }, plannerView: ['chat'] },
    metadata: { requestId: 'req-1' },
  })
  const toolData = adapter.toSseData({
    type: 'tool_done',
    payload: { tool: { code: 'weather', result: { ok: true } } },
    metadata: { requestId: 'req-1' },
  })

  assert.match(planData, /^data: \{"type":"plan"/)
  assert.match(toolData, /^data: \{"type":"tool_done"/)
  assert.equal(adapter.toSseData({ type: 'done', payload: {}, metadata: {} }), 'data: [DONE]\n\n')
})

test('Composer stays outside transport, configuration and persistence boundaries', () => {
  const composer = readSource('src/ai-runtime/composer/agent-composer.service.ts')
  const adapter = readSource('src/ai-runtime/adapter/sse-event.adapter.ts')

  assert.match(composer, /^\/\/ 汇总新版智能体执行事件并生成协议无关事件。/)
  assert.doesNotMatch(composer, /Express|Response|SSE|PrismaService|ModelResolverService|LlmService|KnowledgeQAService/)
  assert.doesNotMatch(adapter, /AgentContextBuilder|AgentPlanner|AgentCapabilityExecutor|PrismaService/)
})
