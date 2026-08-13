// 用接口模拟验证新版智能体计划生成和校验的第四步合同。
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

// 加载新版智能体计划相关运行时类用于接口模拟。
function loadRuntime() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return {
    ...require(join(rootDir, 'src/ai-runtime/capability/capability-resolver.service')),
    ...require(join(rootDir, 'src/ai-runtime/llm/llm.service')),
    ...require(join(rootDir, 'src/ai-runtime/planner/intent-classifier.service')),
    ...require(join(rootDir, 'src/ai-runtime/planner/rule-planner.service')),
    ...require(join(rootDir, 'src/ai-runtime/validator/agent-plan-validator.service')),
  }
}

// 构造 Planner 合同测试所需的智能体上下文。
function createContext(message = '企业版多少钱？', overrides = {}) {
  return {
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    history: overrides.history || [],
    message: { content: message },
    prompt: { id: 'prompt-1', system: '你是客服智能体。' },
    model: { model: 'mock-model', baseUrl: 'http://mock.local', apiKey: 'mock-key' },
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: ['search_knowledge', 'weather'],
      workflowCode: 'customer_workflow',
    },
    execution: { maxSteps: 1 },
    metadata: { requestId: 'req-1' },
    ...overrides,
  }
}

// 构造 Planner 可见的最小工具目录。
function createPlannerToolCatalog(tools = [
  {
    code: 'weather',
    name: '天气查询',
    description: '查询指定城市天气',
    inputSchema: {
      type: 'object',
      properties: { city: { type: 'string', description: '城市名称' } },
      required: ['city'],
      additionalProperties: false,
    },
  },
]) {
  return tools
}

// 构造 Validator 使用的最小运行时工具目录。
function createToolRegistry(tools) {
  return {
    getTool: (code) => tools.find((tool) => tool.code === code),
    listToolsByCodes: (toolCodes) => toolCodes
      .map((code) => tools.find((tool) => tool.code === code))
      .filter((tool) => tool && tool.enabled && tool.exposure === 'agent'),
  }
}

test('Planner types define ExecutionPlan without route output', () => {
  const types = readSource('src/ai-runtime/planner/agent-planner.types.ts')

  assert.match(types, /^\/\/ 定义新版智能体计划生成和校验使用的执行计划类型。/)
  assert.match(types, /export type ExecutionStep = \{/)
  assert.match(types, /capability: CapabilityType/)
  assert.match(types, /export type ExecutionPlan = \{/)
  assert.match(types, /metadata: \{[\s\S]*version: number/)
  assert.match(types, /strategy: PlanStrategy/)
  assert.match(types, /steps: ExecutionStep\[\]/)
  assert.doesNotMatch(types, /\broute\b/)
})

test('RulePlanner uses AI intent classification instead of hardcoded keyword routing', async () => {
  const { CapabilityResolver, RulePlanner } = loadRuntime()
  const context = createContext('请问这套方案怎么卖？')
  const capabilities = new CapabilityResolver(createToolRegistry([
    {
      code: 'weather',
      name: '天气查询',
      description: '查询指定城市天气',
      enabled: true,
      exposure: 'agent',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
  ])).resolve(context)
  const classifierCalls = []
  const classifier = {
    classify: async (input) => {
      classifierCalls.push(input)
      return {
        capability: 'rag',
        confidence: 0.91,
        reason: '用户在询问企业方案售卖信息，需要查询知识库',
        input: {
          originalQuestion: input.message,
          rewrittenQuestion: '企业版的售卖价格是多少？',
          rewriteApplied: true,
          query: '企业版的售卖价格是多少？',
        },
      }
    },
  }

  const plan = await new RulePlanner(classifier).plan(context, capabilities.plannerView, capabilities.plannerToolCatalog)

  assert.equal(classifierCalls.length, 1)
  assert.equal(classifierCalls[0].message, '请问这套方案怎么卖？')
  assert.deepEqual(classifierCalls[0].availableCapabilities, ['chat', 'rag', 'tool', 'workflow'])
  assert.deepEqual(plan.metadata, { version: 1 })
  assert.deepEqual(plan.strategy, { mode: 'sequential' })
  assert.equal(plan.steps.length, 1)
  assert.equal(plan.steps[0].capability, 'rag')
  assert.equal(plan.steps[0].reason, '用户在询问企业方案售卖信息，需要查询知识库')
  assert.equal(plan.steps[0].input.originalQuestion, '请问这套方案怎么卖？')
  assert.equal(plan.steps[0].input.rewrittenQuestion, '企业版的售卖价格是多少？')
  assert.equal(plan.steps[0].input.rewriteApplied, true)
  assert.equal(plan.steps[0].input.query, '企业版的售卖价格是多少？')
  assert.equal(Object.prototype.hasOwnProperty.call(plan, 'route'), false)
})

test('RulePlanner passes recent history to intent classifier and keeps rewritten question for every capability', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('售后怎么样', {
    history: [
      { role: 'user', content: '智能办公助手Pro怎么样？' },
      { role: 'assistant', content: '智能办公助手Pro 是面向企业办公的产品。' },
    ],
  })
  const classifierCalls = []
  const makeClassification = (capability) => ({
    capability,
    confidence: 0.91,
    reason: '用户追问上一轮产品售后政策',
    input: {
      originalQuestion: '售后怎么样',
      rewrittenQuestion: '智能办公助手Pro 的售后服务政策是什么？',
      rewriteApplied: true,
      query: '智能办公助手Pro 的售后服务政策是什么？',
    },
  })
  const classifier = {
    classify: async (input) => {
      classifierCalls.push(input)
      return makeClassification('rag')
    },
  }

  const ragPlan = await new RulePlanner(classifier).plan(context, ['chat', 'rag'], [])
  const chatPlan = await new RulePlanner({ classify: async () => makeClassification('chat') }).plan(context, ['chat'], [])
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      ...makeClassification('tool'),
      toolCode: 'weather',
      input: { ...makeClassification('tool').input, city: '上海' },
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog())
  const workflowPlan = await new RulePlanner({ classify: async () => makeClassification('workflow') }).plan(context, ['chat', 'workflow'], [])

  assert.deepEqual(classifierCalls[0].history, context.history)
  assert.equal(ragPlan.steps[0].input.query, '智能办公助手Pro 的售后服务政策是什么？')
  assert.equal(chatPlan.steps[0].input.message, '智能办公助手Pro 的售后服务政策是什么？')
  assert.equal(toolPlan.steps[0].input.params.city, '上海')
  assert.equal(toolPlan.steps[0].input.params.message, undefined)
  assert.equal(workflowPlan.steps[0].input.message, '智能办公助手Pro 的售后服务政策是什么？')
  for (const plan of [ragPlan, chatPlan, toolPlan, workflowPlan]) {
    assert.equal(plan.steps[0].input.originalQuestion, '售后怎么样')
    assert.equal(plan.steps[0].input.rewrittenQuestion, '智能办公助手Pro 的售后服务政策是什么？')
    assert.equal(plan.steps[0].input.rewriteApplied, true)
  }
})

test('RulePlanner falls back to chat when AI classification is unavailable or unsafe', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('企业版价格是多少？')
  const unavailablePlan = await new RulePlanner({
    classify: async () => ({ capability: 'rag', confidence: 0.95, reason: '模型选择了未授权知识库', input: {} }),
  }).plan(context, ['chat'], [])
  const lowConfidencePlan = await new RulePlanner({
    classify: async () => ({ capability: 'tool', confidence: 0.49, reason: '模型不确定', input: {} }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog())
  const failedClassifierPlan = await new RulePlanner({
    classify: async () => {
      throw new Error('classifier failed')
    },
  }).plan(context, ['chat', 'rag'], [])

  assert.deepEqual(unavailablePlan.steps.map((step) => step.capability), ['chat'])
  assert.deepEqual(lowConfidencePlan.steps.map((step) => step.capability), ['chat'])
  assert.deepEqual(failedClassifierPlan.steps.map((step) => step.capability), ['chat'])
  assert.equal(JSON.stringify(unavailablePlan).includes('未绑定可用知识库'), false)
})

test('IntentClassifierService uses shared runtime LLM service instead of a second model client', async () => {
  const { IntentClassifierService } = loadRuntime()
  const calls = []
  const classifier = new IntentClassifierService({
    invokeWithMessages: async (messages, options) => {
      calls.push({ messages, options })
      return '{"capability":"tool","confidence":0.88,"reason":"需要工具","input":{"params":{"city":"上海"}}}'
    },
  })
  const intentClassifier = readSource('src/ai-runtime/planner/intent-classifier.service.ts')
  const llmService = readSource('src/ai-runtime/llm/llm.service.ts')
  const module = readSource('src/modules/agent-chat/agent-chat.module.ts')

  const result = await classifier.classify({
    message: '帮我查上海天气',
    availableCapabilities: ['chat', 'tool'],
    plannerToolCatalog: createPlannerToolCatalog(),
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    history: [{ role: 'user', content: '我在上海' }],
  }, createContext())

  assert.equal(result.capability, 'tool')
  assert.equal(result.confidence, 0.88)
  assert.equal(result.toolCode, undefined)
  assert.equal(result.input.params.city, '上海')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].options.temperature, 0)
  assert.equal(calls[0].options.topP, 0.1)
  assert.equal(calls[0].options.finalAnswerGuard, undefined)
  assert.match(calls[0].messages[0].content, /只输出 JSON/)
  assert.match(calls[0].messages[0].content, /originalQuestion/)
  assert.match(calls[0].messages[0].content, /rewrittenQuestion/)
  assert.match(calls[0].messages[0].content, /rewriteApplied/)
  assert.match(calls[0].messages[1].content, /"recentHistory"/)
  assert.equal(JSON.parse(calls[0].messages[1].content).capabilities, undefined)
  assert.match(calls[0].messages[1].content, /"plannerToolCatalog"/)
  assert.match(llmService, /^\/\/ 封装 OpenAI 兼容模型的非流式与流式调用。/)
  assert.match(intentClassifier, /LlmService/)
  assert.match(module, /LlmService/)
  assert.doesNotMatch(intentClassifier, /ai-engine\/llm|RuntimeLlmClientService/)
})

test('IntentClassifierService separates current message from recent history for follow-up rewrite', async () => {
  const { IntentClassifierService } = loadRuntime()
  const calls = []
  const classifier = new IntentClassifierService({
    invokeWithMessages: async (messages) => {
      calls.push({ messages })
      return '{"capability":"rag","confidence":0.92,"reason":"追问产品售后","input":{"originalQuestion":"售后怎么样","rewrittenQuestion":"智能办公助手Pro 的售后政策是什么？","rewriteApplied":true,"query":"智能办公助手Pro 的售后政策是什么？"}}'
    },
  })

  await classifier.classify({
    message: '售后怎么样',
    availableCapabilities: ['chat', 'rag'],
    plannerToolCatalog: [],
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    history: [
      { role: 'user', content: '智能办公助手Pro多少钱一年' },
      { role: 'assistant', content: '智能办公助手Pro 的基础版本 1999 元/年。' },
      { role: 'user', content: '售后怎么样' },
    ],
  }, createContext('售后怎么样'))

  const systemPrompt = calls[0].messages[0].content
  const userPrompt = JSON.parse(calls[0].messages[1].content)
  assert.match(systemPrompt, /省略了主体、对象、产品或场景/)
  assert.match(systemPrompt, /智能办公助手Pro 的售后政策是什么/)
  assert.equal(userPrompt.currentMessage, '售后怎么样')
  assert.deepEqual(userPrompt.recentHistory, [
    { role: 'user', content: '智能办公助手Pro多少钱一年' },
    { role: 'assistant', content: '智能办公助手Pro 的基础版本 1999 元/年。' },
  ])
  assert.equal(Object.prototype.hasOwnProperty.call(userPrompt, 'history'), false)
})

test('RulePlanner selects one concrete tool from PlannerToolCatalog and uses model input', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查一下上海天气')
  const classifierCalls = []
  const toolPlan = await new RulePlanner({
    classify: async (input) => {
      classifierCalls.push(input)
      return {
        capability: 'tool',
        confidence: 0.9,
        toolCode: 'weather',
        input: { city: '上海' },
        reason: '用户要查询天气',
      }
    },
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog([
    {
      code: 'weather',
      name: '天气查询',
      description: '查询指定城市天气',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
    {
      code: 'get_user_menu_permissions',
      name: '查询用户菜单权限',
      description: '查询当前用户拥有的菜单权限',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ]))

  assert.equal(toolPlan.steps[0].capability, 'tool')
  assert.equal(toolPlan.steps[0].input.toolCode, 'weather')
  assert.deepEqual(toolPlan.steps[0].input.params, { city: '上海' })
  assert.equal(toolPlan.steps.length, 1)
  assert.equal(classifierCalls[0].plannerToolCatalog.length, 2)
  assert.deepEqual(classifierCalls[0].plannerToolCatalog.map((tool) => tool.code), ['weather', 'get_user_menu_permissions'])
})

test('RulePlanner emits toolCalls array for a single selected tool while keeping legacy fields', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查一下上海天气')
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCalls: [
        { toolCode: 'weather', params: { city: '上海' } },
      ],
      reason: '用户要查询天气',
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog())

  assert.equal(toolPlan.steps[0].capability, 'tool')
  assert.deepEqual(toolPlan.steps[0].input.toolCalls, [
    { toolCode: 'weather', params: { city: '上海' } },
  ])
  assert.equal(toolPlan.steps[0].input.toolCode, 'weather')
  assert.deepEqual(toolPlan.steps[0].input.params, { city: '上海' })
})

test('RulePlanner can select multiple independent tools from PlannerToolCatalog', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查询上海天气，并搜索上海今天重大新闻')
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCalls: [
        { toolCode: 'weather', params: { city: '上海' } },
        { toolCode: 'search', params: { query: '上海今天重大新闻' } },
      ],
      reason: '用户需要查询天气并搜索新闻',
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog([
    {
      code: 'weather',
      name: '天气查询',
      description: '查询指定城市天气',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
    {
      code: 'search',
      name: '搜索',
      description: '搜索公开信息',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  ]))

  assert.equal(toolPlan.steps[0].capability, 'tool')
  assert.deepEqual(toolPlan.steps[0].input.toolCalls, [
    { toolCode: 'weather', params: { city: '上海' } },
    { toolCode: 'search', params: { query: '上海今天重大新闻' } },
  ])
  assert.equal(toolPlan.steps[0].input.toolCalls.length, 2)
})

test('RulePlanner keeps repeated tool calls when params are different', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查询上海和北京天气')
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCalls: [
        { toolCode: 'weather', params: { city: '上海' } },
        { toolCode: 'weather', params: { city: '北京' } },
      ],
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog())

  assert.deepEqual(toolPlan.steps[0].input.toolCalls, [
    { toolCode: 'weather', params: { city: '上海' } },
    { toolCode: 'weather', params: { city: '北京' } },
  ])
})

test('RulePlanner does not default to the first tool when model selects another authorized tool', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('当前用户有哪些菜单权限？')
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCode: 'get_user_menu_permissions',
      input: {},
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog([
    {
      code: 'weather',
      name: '天气查询',
      description: '查询指定城市天气',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
    {
      code: 'get_user_menu_permissions',
      name: '查询用户菜单权限',
      description: '查询当前用户拥有的菜单权限',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ]))

  assert.equal(toolPlan.steps[0].input.toolCode, 'get_user_menu_permissions')
  assert.deepEqual(toolPlan.steps[0].input.params, {})
})

test('RulePlanner falls back to chat when model selects tool outside PlannerToolCatalog or when no tools are visible', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查用户权限')
  const unknownToolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCode: 'unknown_tool',
      input: {},
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog())
  const noToolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCode: 'weather',
      input: { city: '上海' },
    }),
  }).plan(context, ['chat'], [])

  assert.equal(unknownToolPlan.steps[0].capability, 'chat')
  assert.equal(noToolPlan.steps[0].capability, 'chat')
})

test('RulePlanner falls back to chat when any multi tool call is outside PlannerToolCatalog', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查天气和未知工具')
  const plan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCalls: [
        { toolCode: 'weather', params: { city: '上海' } },
        { toolCode: 'unknown_tool', params: {} },
      ],
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog())

  assert.equal(plan.steps[0].capability, 'chat')
})

test('RulePlanner strips runtime context fields from tool input', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查询当前用户菜单权限')
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCode: 'get_user_menu_permissions',
      input: {
        userId: 'model-user',
        agentCode: 'agent',
        conversationId: 'conv',
        requestId: 'req',
        traceId: 'trace',
        signal: 'signal',
      },
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog([
    {
      code: 'get_user_menu_permissions',
      name: '查询用户菜单权限',
      description: '查询当前用户拥有的菜单权限',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ]))

  assert.equal(toolPlan.steps[0].input.toolCode, 'get_user_menu_permissions')
  assert.deepEqual(toolPlan.steps[0].input.params, {})
  assert.equal(JSON.stringify(toolPlan).includes('userId'), false)
})

test('RulePlanner strips runtime context fields from every multi tool params object', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查上海天气和当前用户菜单权限')
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCalls: [
        {
          toolCode: 'weather',
          params: { city: '上海', userId: 'model-user', conversationId: 'conv' },
        },
        {
          toolCode: 'get_user_menu_permissions',
          params: { userId: 'model-user', agentCode: 'agent' },
        },
      ],
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog([
    {
      code: 'weather',
      name: '天气查询',
      description: '查询指定城市天气',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
    {
      code: 'get_user_menu_permissions',
      name: '查询用户菜单权限',
      description: '查询当前用户拥有的菜单权限',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ]))

  assert.deepEqual(toolPlan.steps[0].input.toolCalls, [
    { toolCode: 'weather', params: { city: '上海' } },
    { toolCode: 'get_user_menu_permissions', params: {} },
  ])
  assert.equal(JSON.stringify(toolPlan).includes('userId'), false)
  assert.equal(JSON.stringify(toolPlan).includes('agentCode'), false)
  assert.equal(JSON.stringify(toolPlan).includes('conversationId'), false)
})

test('RulePlanner rejects invalid required tool input and returns chat', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('查天气')
  const plan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      toolCode: 'weather',
      input: {},
    }),
  }).plan(context, ['chat', 'tool'], createPlannerToolCatalog())

  assert.equal(plan.steps[0].capability, 'chat')
})

test('RulePlanner keeps workflow code from AgentContext instead of AI input', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('执行客户流程')
  const workflowPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'workflow',
      confidence: 0.9,
      input: { workflowCode: 'other_workflow', message: '覆盖消息' },
    }),
  }).plan(context, ['chat', 'workflow'], [])

  assert.equal(workflowPlan.steps[0].input.workflowCode, 'customer_workflow')
  assert.equal(workflowPlan.steps[0].input.message, '执行客户流程')
  assert.equal(workflowPlan.steps[0].input.originalQuestion, '执行客户流程')
  assert.equal(workflowPlan.steps[0].input.rewrittenQuestion, '执行客户流程')
  assert.equal(workflowPlan.steps[0].input.rewriteApplied, false)
})

test('Validator rejects unavailable capabilities before executor can run', () => {
  const { AgentPlanValidator } = loadRuntime()
  const validator = new AgentPlanValidator(createToolRegistry([]))
  const context = createContext()
  const plan = {
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'rag', reason: '用户询价', input: { query: '企业版多少钱？' } }],
  }

  assert.throws(() => validator.validate(plan, context, ['chat']), /能力未授权或不可用：rag/)
})

test('Validator rejects tool and workflow steps outside AgentContext authorization', () => {
  const { AgentPlanValidator } = loadRuntime()
  const validator = new AgentPlanValidator(createToolRegistry([
    { code: 'weather', enabled: true, exposure: 'agent', source: 'builtin' },
  ]))
  const context = createContext()

  assert.throws(() => validator.validate({
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'tool', input: { toolCode: 'not_allowed' } }],
  }, context, ['tool']), /工具未授权：not_allowed/)

  assert.throws(() => validator.validate({
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'workflow', input: { workflowCode: 'other_workflow' } }],
  }, context, ['workflow']), /工作流未绑定：other_workflow/)
})

test('Validator enforces maxSteps from AgentContext execution config', () => {
  const { AgentPlanValidator } = loadRuntime()
  const validator = new AgentPlanValidator(createToolRegistry([]))
  const context = createContext()

  assert.throws(() => validator.validate({
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [
      { id: 'step_1', capability: 'rag', input: { query: '企业版多少钱？' } },
      { id: 'step_2', capability: 'chat', input: { usePreviousStepResult: true } },
    ],
  }, context, ['rag', 'chat']), /计划步骤超过上限/)
})

test('AgentRuntime uses RulePlanner directly without AgentPlanner forwarding layer', () => {
  const agentRuntime = readSource('src/ai-runtime/agent-runtime.service.ts')
  const agentChatModule = readSource('src/modules/agent-chat/agent-chat.module.ts')
  const agentPlannerPath = join(rootDir, 'src/ai-runtime/planner/agent-planner.service.ts')

  assert.equal(existsSync(agentPlannerPath), false)
  assert.match(agentRuntime, /RulePlanner/)
  assert.doesNotMatch(agentRuntime, /AgentPlanner/)
  assert.doesNotMatch(agentChatModule, /AgentPlanner/)
})

test('Validator rejects unknown disabled and internal tools even when model returns them', () => {
  const { AgentPlanValidator } = loadRuntime()
  const validator = new AgentPlanValidator(createToolRegistry([
    { code: 'weather', enabled: true, exposure: 'agent', source: 'builtin' },
    { code: 'disabled_weather', enabled: false, exposure: 'agent', source: 'builtin' },
    { code: 'search_knowledge', enabled: true, exposure: 'internal', source: 'builtin' },
  ]))
  const context = createContext('查工具', {
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: ['weather', 'disabled_weather', 'search_knowledge', 'unknown_tool'],
      workflowCode: '',
    },
  })
  const createToolPlan = (toolCode) => ({
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'tool', input: { toolCode, params: {} } }],
  })

  assert.doesNotThrow(() => validator.validate(createToolPlan('weather'), context, ['tool']))
  assert.throws(() => validator.validate(createToolPlan('unknown_tool'), context, ['tool']), /工具不可用：unknown_tool/)
  assert.throws(() => validator.validate(createToolPlan('disabled_weather'), context, ['tool']), /工具不可用：disabled_weather/)
  assert.throws(() => validator.validate(createToolPlan('search_knowledge'), context, ['tool']), /工具未授权：search_knowledge|工具不可用：search_knowledge/)
})

test('Validator checks every multi tool call before executor can run', () => {
  const { AgentPlanValidator } = loadRuntime()
  const validator = new AgentPlanValidator(createToolRegistry([
    { code: 'weather', enabled: true, exposure: 'agent', source: 'builtin' },
    { code: 'search', enabled: true, exposure: 'agent', source: 'rest' },
    { code: 'disabled_weather', enabled: false, exposure: 'agent', source: 'builtin' },
    { code: 'search_knowledge', enabled: true, exposure: 'internal', source: 'builtin' },
  ]))
  const context = createContext('查多工具', {
    capabilities: {
      knowledgeEnabled: false,
      knowledgeStrict: false,
      knowledgeBaseIds: [],
      knowledgeTags: [],
      toolCodes: ['weather', 'search', 'disabled_weather', 'search_knowledge', 'unknown_tool'],
      workflowCode: '',
    },
  })
  const createPlan = (toolCalls) => ({
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'tool', input: { toolCalls } }],
  })

  assert.doesNotThrow(() => validator.validate(createPlan([
    { toolCode: 'weather', params: { city: '上海' } },
    { toolCode: 'search', params: { query: '上海今天重大新闻' } },
  ]), context, ['tool']))
  assert.throws(() => validator.validate(createPlan([
    { toolCode: 'weather', params: { city: '上海' } },
    { toolCode: 'unknown_tool', params: {} },
  ]), context, ['tool']), /工具不可用：unknown_tool/)
  assert.throws(() => validator.validate(createPlan([
    { toolCode: 'weather', params: { city: '上海' } },
    { toolCode: 'disabled_weather', params: {} },
  ]), context, ['tool']), /工具不可用：disabled_weather/)
  assert.throws(() => validator.validate(createPlan([
    { toolCode: 'weather', params: { city: '上海' } },
    { toolCode: 'search_knowledge', params: {} },
  ]), context, ['tool']), /工具未授权：search_knowledge|工具不可用：search_knowledge/)
})

test('Planner does not directly execute tools or introduce selector and repair services', () => {
  const rulePlanner = readSource('src/ai-runtime/planner/rule-planner.service.ts')
  const intentClassifier = readSource('src/ai-runtime/planner/intent-classifier.service.ts')
  const files = [rulePlanner, intentClassifier].join('\n')

  assert.doesNotMatch(files, /ToolExecutor|DefaultToolExecutor|BuiltinTool/)
  assert.doesNotMatch(files, /new ToolSelector|class ToolSelector|ToolSelectorService/)
  assert.doesNotMatch(files, /ParameterExtractor|ToolInputRepairService/)
  assert.doesNotMatch(rulePlanner, /toolCodes\.find|toolCodes\[0\]|availableTools\[0\]|tools\[0\]/)
  assert.doesNotMatch(rulePlanner, /AgentLoop|replan|retry/i)
  assert.doesNotMatch(rulePlanner, /fallback/i)
})

test('Planner and Validator do not reference old route runtime services', () => {
  const rulePlanner = readSource('src/ai-runtime/planner/rule-planner.service.ts')
  const intentClassifier = readSource('src/ai-runtime/planner/intent-classifier.service.ts')
  const validator = readSource('src/ai-runtime/validator/agent-plan-validator.service.ts')
  const combined = [rulePlanner, intentClassifier, validator].join('\n')

  assert.match(rulePlanner, /^\/\/ 基于 AI 意图识别生成新版智能体第一版执行计划。/)
  assert.match(intentClassifier, /^\/\/ 使用大模型识别新版智能体本次请求应进入的能力。/)
  assert.match(validator, /^\/\/ 校验新版智能体执行计划是否只使用已授权能力。/)
  assert.doesNotMatch(rulePlanner, /INTENT_PATTERN|价格|多少钱|售价|费用|收费|weather|天气/)
  assert.doesNotMatch(combined, /AgentPlanService|AgentRuntimeService|AgentExecutorService|ChatService/)
  assert.doesNotMatch(combined, /\broute\b/)
})
