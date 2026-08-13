// 校验 Phase 7 最小 Agent Loop 只负责有限循环并复用现有 Planner/Validator/Executor 链路。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

// 读取源码文件并确认文件存在。
function readSource(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  assert.equal(existsSync(absolutePath), true, `${relativePath} should exist`)
  return readFileSync(absolutePath, 'utf8')
}

// 加载 Agent Loop 相关运行时类。
function loadRuntime() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return {
    ...require(join(rootDir, 'src/ai-runtime/agent-runtime.service')),
    ...require(join(rootDir, 'src/ai-runtime/composer/agent-composer.service')),
  }
}

// 构造运行时请求。
function createRequest() {
  return {
    message: { content: '查询上海天气，然后搜索上海今天的重要新闻' },
    agent: { code: 'customer_service' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    metadata: { requestId: 'req-loop-1' },
  }
}

// 构造运行时上下文。
function createContext() {
  return {
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    history: [],
    message: { content: createRequest().message.content },
    prompt: { id: 'prompt-1', system: '你是客服智能体。' },
    model: { model: 'mock-model', baseUrl: 'http://mock.local', apiKey: 'mock-key' },
    capabilities: {
      knowledgeEnabled: false,
      knowledgeStrict: false,
      knowledgeBaseIds: [],
      knowledgeTags: [],
      toolCodes: ['weather', 'search'],
      workflowCode: '',
    },
    execution: { maxSteps: 1 },
    metadata: { requestId: createRequest().metadata.requestId },
  }
}

// 构造工具计划。
function createToolPlan(toolCode, params = {}) {
  return {
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{
      id: `step_${toolCode}`,
      capability: 'tool',
      reason: `调用 ${toolCode}`,
      input: { toolCode, params, toolCalls: [{ toolCode, params }] },
    }],
  }
}

// 构造普通对话计划。
function createChatPlan(input = {}) {
  return {
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_chat', capability: 'chat', reason: '工具结果足够生成回答', input }],
  }
}

// 收集异步事件流中的所有事件。
async function collect(iterable) {
  const events = []
  for await (const event of iterable) {
    events.push(event)
  }
  return events
}

// 构造可观察的 AgentRuntimeService。
function createRuntime(plans, options = {}) {
  const { AgentRuntimeService, AgentComposer } = loadRuntime()
  const context = options.context || createContext()
  const plannerCalls = []
  const executorPlans = []
  const traceCalls = []
  const validator = options.validator || {
    validate: (plan) => plan,
  }
  const runtime = new AgentRuntimeService(
    { build: async () => context },
    {
      resolve: () => ({
        plannerView: ['chat', 'tool'],
        plannerToolCatalog: [
          { code: 'weather', name: '天气', description: '查询天气', inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } },
          { code: 'search', name: '搜索', description: '搜索新闻', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
        ],
        diagnosticView: [],
      }),
    },
    {
      plan: async (receivedContext, plannerView, plannerToolCatalog, toolResults) => {
        plannerCalls.push({ receivedContext, plannerView, plannerToolCatalog, toolResults })
        return typeof plans === 'function' ? plans(plannerCalls.length, toolResults || []) : plans[plannerCalls.length - 1]
      },
    },
    validator,
    {
      execute: async function* (plan, receivedContext) {
        executorPlans.push({ plan, receivedContext })
        const step = plan.steps[0]
        if (step.capability === 'chat') {
          yield { type: 'content', payload: { text: '最终回答' }, metadata: { requestId: 'req-loop-1', capability: 'chat' } }
          return
        }
        const toolCode = step.input.toolCode
        const result = options.toolResults?.[toolCode] || { success: true, data: { toolCode, value: `${toolCode}-result` } }
        yield { type: 'tool_start', payload: { tool: { code: toolCode, params: step.input.params } }, metadata: { requestId: 'req-loop-1', capability: 'tool' } }
        yield { type: 'tool_done', payload: { tool: { code: toolCode, result } }, metadata: { requestId: 'req-loop-1', capability: 'tool' } }
        yield { type: 'content', payload: { text: `中间工具展示：${toolCode}` }, metadata: { requestId: 'req-loop-1', capability: 'tool' } }
      },
    },
    new AgentComposer(),
    {
      start: async (_context, plan) => { traceCalls.push(['start', plan.steps[0].capability]); return { id: 'trace-1' } },
      finish: async () => traceCalls.push(['finish']),
      fail: async (_id, error) => traceCalls.push(['fail', error instanceof Error ? error.message : String(error)]),
    },
  )

  return { runtime, context, plannerCalls, executorPlans, traceCalls }
}

test('Agent Loop ends immediately when Planner returns chat', async () => {
  const { runtime, plannerCalls, executorPlans } = createRuntime([createChatPlan()])

  const events = await collect(runtime.stream(createRequest()))

  assert.equal(plannerCalls.length, 1)
  assert.equal(executorPlans.length, 1)
  assert.deepEqual(events.map((event) => event.type), ['plan', 'content'])
  assert.equal(events.some((event) => event.type === 'tool_done'), false)
})

test('Agent Loop passes one ToolResult into the next Planner turn and keeps intermediate tool content out of final content', async () => {
  const { runtime, plannerCalls, executorPlans } = createRuntime([
    createToolPlan('weather', { city: '上海' }),
    createChatPlan(),
  ])

  const events = await collect(runtime.stream(createRequest()))

  assert.equal(plannerCalls.length, 2)
  assert.equal(executorPlans.filter((item) => item.plan.steps[0].capability === 'tool').length, 1)
  assert.equal(plannerCalls[1].toolResults.length, 1)
  assert.equal(plannerCalls[1].toolResults[0].toolCall.toolCode, 'weather')
  assert.deepEqual(plannerCalls[1].toolResults[0].toolCall.params, { city: '上海' })
  assert.deepEqual(plannerCalls[1].toolResults[0].result, { success: true, data: { toolCode: 'weather', value: 'weather-result' } })
  assert.deepEqual(events.filter((event) => event.type === 'content').map((event) => event.payload.text), ['最终回答'])
})

test('Agent Loop supports two serial tool turns before final chat', async () => {
  const { runtime, plannerCalls, executorPlans } = createRuntime([
    createToolPlan('weather', { city: '上海' }),
    createToolPlan('search', { query: '上海今天的重要新闻' }),
    createChatPlan(),
  ])

  const events = await collect(runtime.stream(createRequest()))

  assert.equal(plannerCalls.length, 3)
  assert.deepEqual(executorPlans.map((item) => item.plan.steps[0].capability), ['tool', 'tool', 'chat'])
  assert.deepEqual(events.filter((event) => event.type === 'tool_done').map((event) => event.payload.tool.code), ['weather', 'search'])
  assert.equal(plannerCalls[2].toolResults.length, 2)
  assert.deepEqual(plannerCalls[2].toolResults.map((item) => item.toolCall.toolCode), ['weather', 'search'])
})

test('Tool failure enters the next Planner turn without automatic repeated execution', async () => {
  const failedWeather = { success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'weather down' } }
  const { runtime, plannerCalls, executorPlans } = createRuntime([
    createToolPlan('weather', { city: '上海' }),
    createChatPlan(),
  ], {
    toolResults: { weather: failedWeather },
  })

  await collect(runtime.stream(createRequest()))

  assert.equal(executorPlans.filter((item) => item.plan.steps[0].capability === 'tool').length, 1)
  assert.deepEqual(plannerCalls[1].toolResults[0].result, failedWeather)
})

test('Agent Loop stops at maxIterations when Planner never returns chat', async () => {
  const { DEFAULT_MAX_ITERATIONS } = loadRuntime()
  const { runtime, plannerCalls, executorPlans } = createRuntime(() => createToolPlan('weather', { city: '上海' }))

  await assert.rejects(() => collect(runtime.stream(createRequest())), /Agent Loop 达到最大轮数/)

  assert.equal(plannerCalls.length, DEFAULT_MAX_ITERATIONS)
  assert.equal(executorPlans.length, DEFAULT_MAX_ITERATIONS)
})

test('Validator remains the boundary for unauthorized and internal tools in later turns', async () => {
  const validatorCalls = []
  const validator = {
    validate: (plan) => {
      const toolCode = plan.steps[0].input.toolCode
      validatorCalls.push(toolCode || plan.steps[0].capability)
      if (toolCode === 'unauthorizedTool' || toolCode === 'search_knowledge') {
        throw new Error(`工具未授权：${toolCode}`)
      }
      return plan
    },
  }
  const unauthorizedRuntime = createRuntime([
    createToolPlan('weather', { city: '上海' }),
    createToolPlan('unauthorizedTool', {}),
  ], { validator })
  await assert.rejects(() => collect(unauthorizedRuntime.runtime.stream(createRequest())), /工具未授权：unauthorizedTool/)
  assert.deepEqual(unauthorizedRuntime.executorPlans.map((item) => item.plan.steps[0].input.toolCode), ['weather'])

  const internalRuntime = createRuntime([
    createToolPlan('weather', { city: '上海' }),
    createToolPlan('search_knowledge', {}),
  ], { validator })
  await assert.rejects(() => collect(internalRuntime.runtime.stream(createRequest())), /工具未授权：search_knowledge/)
  assert.deepEqual(internalRuntime.executorPlans.map((item) => item.plan.steps[0].input.toolCode), ['weather'])
})

test('Loop state stays out of Tool input and executor runtime context', async () => {
  const { runtime, executorPlans, context } = createRuntime([
    createToolPlan('weather', { city: '上海' }),
    createChatPlan(),
  ])

  await collect(runtime.stream(createRequest()))

  assert.deepEqual(executorPlans[0].plan.steps[0].input.params, { city: '上海' })
  assert.equal(JSON.stringify(executorPlans[0].plan.steps[0].input).includes('maxIterations'), false)
  assert.equal(JSON.stringify(executorPlans[0].plan.steps[0].input).includes('iteration'), false)
  assert.equal(JSON.stringify(executorPlans[0].receivedContext).includes('toolResults'), false)
  assert.equal(JSON.stringify(context).includes('toolResults'), false)
})

test('Agent Loop contract does not introduce direct tool or adapter execution shortcuts', () => {
  const runtime = readSource('src/ai-runtime/agent-runtime.service.ts')

  assert.match(runtime, /DEFAULT_MAX_ITERATIONS\s*=\s*5/)
  assert.match(runtime, /for \(let iteration = 0; iteration < DEFAULT_MAX_ITERATIONS; iteration\+\+\)/)
  assert.match(runtime, /this\.planner\.plan\(/)
  assert.match(runtime, /this\.validator\.validate\(/)
  assert.match(runtime, /this\.executor\.execute\(/)
  assert.doesNotMatch(runtime, /RuntimeToolRegistry|BuiltinTool|RestToolAdapter|McpToolAdapter/)
  assert.doesNotMatch(runtime, /while \(true\)|Promise\.all|allSettled|ParallelTool|BatchTool|ToolDependencyGraph|\bDAG\b/)
  assert.doesNotMatch(runtime, /retry|fallback|replan/i)
})
