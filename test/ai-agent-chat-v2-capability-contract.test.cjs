// 用接口模拟验证新版智能体能力解析的第三步合同。
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

// 加载能力解析相关运行时类用于接口模拟。
function loadRuntime() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return require(join(rootDir, 'src/ai-runtime/capability/capability-resolver.service'))
}

// 构造能力解析合同测试所需的智能体上下文。
function createContext(overrides = {}) {
  return {
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    history: [],
    message: { content: '企业版多少钱？' },
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

// 构造最小运行时工具目录，模拟 Phase 1 Registry 的过滤行为。
function createToolRegistry(tools) {
  return {
    listToolsByCodes: (toolCodes) => toolCodes
      .map((code) => tools.find((tool) => tool.code === code))
      .filter((tool) => tool && tool.enabled && tool.exposure === 'agent'),
  }
}

test('Capability types expose only planner-safe capability status models', () => {
  const types = readSource('src/ai-runtime/capability/capability.types.ts')

  assert.match(types, /^\/\/ 定义新版智能体运行时能力解析的类型模型。/)
  assert.match(types, /export type CapabilityType = 'chat' \| 'rag' \| 'tool' \| 'workflow'/)
  assert.match(types, /export type CapabilityStatus = \{/)
  assert.match(types, /capability: CapabilityType/)
  assert.match(types, /available: boolean/)
  assert.match(types, /reason\?: string/)
  assert.match(types, /export type ResolvedCapabilities = \{/)
  assert.match(types, /plannerView: CapabilityType\[\]/)
  assert.match(types, /diagnosticView: CapabilityStatus\[\]/)
  assert.doesNotMatch(types, /AvailableCapability/)
  assert.doesNotMatch(types, /AvailableCapabilities/)
})

test('CapabilityResolver splits plannerView from diagnosticView', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver(createToolRegistry([
    {
      code: 'weather',
      name: '天气查询',
      description: '查询指定城市天气',
      enabled: true,
      exposure: 'agent',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
  ]))

  const result = resolver.resolve(createContext())

  assert.deepEqual(result.plannerView, ['chat', 'rag', 'tool', 'workflow'])
  assert.deepEqual(result.plannerToolCatalog, [{
    code: 'weather',
    name: '天气查询',
    description: '查询指定城市天气',
    inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
  }])
  assert.deepEqual(result.diagnosticView.map((item) => item.capability), ['chat', 'rag', 'tool', 'workflow'])
  assert.equal(result.diagnosticView.every((item) => item.available), true)
})

test('CapabilityResolver builds planner tool catalog from authorized enabled agent tools only', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver(createToolRegistry([
    {
      code: 'weather',
      name: '天气查询',
      description: '查询指定城市天气',
      enabled: true,
      exposure: 'agent',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
    {
      code: 'disabled_weather',
      name: '停用天气',
      description: '停用工具',
      enabled: false,
      exposure: 'agent',
      inputSchema: { type: 'object' },
    },
    {
      code: 'search_knowledge',
      name: '搜索知识库',
      description: '内部知识库工具',
      enabled: true,
      exposure: 'internal',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
    },
  ]))

  const result = resolver.resolve(createContext({
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: ['weather', 'disabled_weather', 'search_knowledge', 'unknown_tool'],
      workflowCode: '',
    },
  }))

  assert.equal(result.plannerView.includes('tool'), true)
  assert.deepEqual(result.plannerToolCatalog.map((tool) => tool.code), ['weather'])
  assert.equal(JSON.stringify(result.plannerToolCatalog).includes('search_knowledge'), false)
  assert.equal(JSON.stringify(result.plannerToolCatalog).includes('disabled_weather'), false)
  assert.equal(JSON.stringify(result.plannerToolCatalog).includes('unknown_tool'), false)
})

test('CapabilityResolver hides tool capability when no enabled agent-exposed tools are visible', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver(createToolRegistry([
    {
      code: 'search_knowledge',
      name: '搜索知识库',
      description: '内部知识库工具',
      enabled: true,
      exposure: 'internal',
      inputSchema: { type: 'object' },
    },
  ]))

  const result = resolver.resolve(createContext({
    capabilities: {
      knowledgeEnabled: false,
      knowledgeStrict: false,
      knowledgeBaseIds: [],
      knowledgeTags: [],
      toolCodes: ['search_knowledge'],
      workflowCode: '',
    },
  }))

  assert.deepEqual(result.plannerView, ['chat'])
  assert.deepEqual(result.plannerToolCatalog, [])
})

test('Capability types expose PlannerToolCatalog without runtime context fields', () => {
  const types = readSource('src/ai-runtime/capability/capability.types.ts')

  assert.match(types, /export type PlannerToolDefinition = \{/)
  assert.match(types, /code: string/)
  assert.match(types, /name: string/)
  assert.match(types, /description: string/)
  assert.match(types, /inputSchema: JsonSchemaObject/)
  assert.match(types, /plannerToolCatalog: PlannerToolDefinition\[\]/)
  assert.doesNotMatch(types, /ToolRuntimeContext/)
})

test('Planner view only includes available capabilities and keeps reasons in diagnostics', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver(createToolRegistry([]))

  const result = resolver.resolve(createContext({
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeBaseIds: [],
      knowledgeTags: [],
      toolCodes: ['search_knowledge'],
    },
  }))

  assert.deepEqual(result.plannerView, ['chat'])
  assert.deepEqual(result.diagnosticView, [
    { capability: 'chat', available: true },
    { capability: 'rag', available: false, reason: '未绑定可用知识库' },
    { capability: 'tool', available: false, reason: '未授权普通工具' },
    { capability: 'workflow', available: false, reason: '未绑定工作流' },
  ])
})

test('RAG requires only knowledgeEnabled and knowledgeBaseIds', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver(createToolRegistry([]))

  const disabled = resolver.resolve(createContext({
    capabilities: {
      knowledgeEnabled: false,
      knowledgeStrict: false,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: ['search_knowledge'],
    },
  }))
  const noSearchTool = resolver.resolve(createContext({
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: [],
    },
  }))

  assert.equal(disabled.plannerView.includes('rag'), false)
  assert.equal(noSearchTool.plannerView.includes('rag'), true)
})

test('CapabilityResolver does not treat search_knowledge as normal tool capability', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver(createToolRegistry([]))

  const result = resolver.resolve(createContext({
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: ['search_knowledge'],
    },
  }))

  assert.deepEqual(result.plannerView, ['chat', 'rag'])
})

test('Workflow capability depends only on workflowCode presence', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver(createToolRegistry([]))

  const result = resolver.resolve(createContext({
    capabilities: {
      knowledgeEnabled: false,
      knowledgeStrict: false,
      knowledgeBaseIds: [],
      knowledgeTags: [],
      toolCodes: [],
      workflowCode: '',
    },
  }))

  assert.equal(result.plannerView.includes('workflow'), false)
})

test('CapabilityResolver keeps runtime boundaries and does not decide execution strategy', () => {
  const resolver = readSource('src/ai-runtime/capability/capability-resolver.service.ts')
  const moduleSource = readSource('src/modules/agent-chat/agent-chat.module.ts')

  assert.match(resolver, /^\/\/ 解析新版智能体当前请求可进入规划的能力边界。/)
  assert.match(resolver, /class CapabilityResolver/)
  assert.match(resolver, /resolve\(context: AgentContext\): ResolvedCapabilities/)
  assert.doesNotMatch(resolver, /ChatService/)
  assert.doesNotMatch(resolver, /AgentRuntimeService/)
  assert.doesNotMatch(resolver, /AgentPlanService/)
  assert.doesNotMatch(resolver, /AgentExecutorService/)
  assert.doesNotMatch(resolver, /topK|TopK|threshold|similarity|embedding|rerank|VectorStoreService|KnowledgeQAService/)
  assert.match(moduleSource, /CapabilityResolver/)
})
