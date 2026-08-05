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
      knowledgeStrict: false,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: [],
      toolCodes: ['search_knowledge', 'weather'],
      workflowCode: 'customer_workflow',
    },
    execution: { stream: true, maxSteps: 1 },
    metadata: {
      requestId: 'req-1',
      channel: 'test',
      source: 'contract',
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
    },
    ...overrides,
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
  const resolver = new CapabilityResolver()

  const result = resolver.resolve(createContext())

  assert.deepEqual(result.plannerView, ['chat', 'rag', 'tool', 'workflow'])
  assert.deepEqual(result.diagnosticView.map((item) => item.capability), ['chat', 'rag', 'tool', 'workflow'])
  assert.equal(result.diagnosticView.every((item) => item.available), true)
})

test('Planner view only includes available capabilities and keeps reasons in diagnostics', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver()

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

test('RAG requires knowledgeEnabled, knowledgeBaseIds and search_knowledge together', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver()

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
  assert.equal(noSearchTool.plannerView.includes('rag'), false)
})

test('CapabilityResolver does not treat search_knowledge as normal tool capability', () => {
  const { CapabilityResolver } = loadRuntime()
  const resolver = new CapabilityResolver()

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
  const resolver = new CapabilityResolver()

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
