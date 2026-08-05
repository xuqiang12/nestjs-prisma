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
    ...require(join(rootDir, 'src/ai-runtime/planner/rule-planner.service')),
    ...require(join(rootDir, 'src/ai-runtime/planner/agent-planner.service')),
    ...require(join(rootDir, 'src/ai-runtime/validator/agent-plan-validator.service')),
  }
}

// 构造 Planner 合同测试所需的智能体上下文。
function createContext(message = '企业版多少钱？', overrides = {}) {
  return {
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    history: [],
    request: {
      message: { content: message },
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

test('RulePlanner chooses RAG for customer price questions when RAG is available', () => {
  const { CapabilityResolver, RulePlanner } = loadRuntime()
  const questions = [
    '企业版价格是多少？',
    '企业版怎么收费？',
    '企业版收费标准是什么？',
    '企业版年费多少？',
    '企业版套餐怎么订阅？',
  ]

  questions.forEach((question) => {
    const context = createContext(question)
    const capabilities = new CapabilityResolver().resolve(context)
    const plan = new RulePlanner().plan(context, capabilities.plannerView)

    assert.deepEqual(plan.metadata, { version: 1 })
    assert.deepEqual(plan.strategy, { mode: 'sequential' })
    assert.equal(plan.steps.length, 1)
    assert.equal(plan.steps[0].capability, 'rag', `${question} should use RAG`)
    assert.equal(plan.steps[0].input.query, question)
    assert.equal(Object.prototype.hasOwnProperty.call(plan, 'route'), false)
  })
})

test('AgentPlanner only receives plannerView and falls back to chat when RAG is unavailable', () => {
  const { AgentPlanner, RulePlanner } = loadRuntime()
  const context = createContext('企业版价格是多少？')
  const planner = new AgentPlanner(new RulePlanner())
  const plan = planner.plan(context, ['chat'])

  assert.deepEqual(plan.steps.map((step) => step.capability), ['chat'])
  assert.equal(JSON.stringify(plan).includes('未绑定可用知识库'), false)
})

test('Validator rejects unavailable capabilities before executor can run', () => {
  const { AgentPlanValidator } = loadRuntime()
  const validator = new AgentPlanValidator()
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
  const validator = new AgentPlanValidator()
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
  const validator = new AgentPlanValidator()
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

test('Planner and Validator do not reference old route runtime services', () => {
  const planner = readSource('src/ai-runtime/planner/agent-planner.service.ts')
  const rulePlanner = readSource('src/ai-runtime/planner/rule-planner.service.ts')
  const validator = readSource('src/ai-runtime/validator/agent-plan-validator.service.ts')
  const combined = [planner, rulePlanner, validator].join('\n')

  assert.match(planner, /^\/\/ 协调新版智能体计划生成入口。/)
  assert.match(rulePlanner, /^\/\/ 基于明确规则生成新版智能体第一版执行计划。/)
  assert.match(validator, /^\/\/ 校验新版智能体执行计划是否只使用已授权能力。/)
  assert.doesNotMatch(combined, /AgentPlanService|AgentRuntimeService|AgentExecutorService|ChatService/)
  assert.doesNotMatch(combined, /\broute\b/)
})
