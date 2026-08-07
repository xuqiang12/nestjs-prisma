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
    history: overrides.history || [],
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

test('RulePlanner uses AI intent classification instead of hardcoded keyword routing', async () => {
  const { CapabilityResolver, RulePlanner } = loadRuntime()
  const context = createContext('请问这套方案怎么卖？')
  const capabilities = new CapabilityResolver().resolve(context)
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

  const plan = await new RulePlanner(classifier).plan(context, capabilities.plannerView)

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

  const ragPlan = await new RulePlanner(classifier).plan(context, ['chat', 'rag'])
  const chatPlan = await new RulePlanner({ classify: async () => makeClassification('chat') }).plan(context, ['chat'])
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      ...makeClassification('tool'),
      input: { ...makeClassification('tool').input, params: { city: '上海' } },
    }),
  }).plan(context, ['chat', 'tool'])
  const workflowPlan = await new RulePlanner({ classify: async () => makeClassification('workflow') }).plan(context, ['chat', 'workflow'])

  assert.deepEqual(classifierCalls[0].history, context.history)
  assert.equal(ragPlan.steps[0].input.query, '智能办公助手Pro 的售后服务政策是什么？')
  assert.equal(chatPlan.steps[0].input.message, '智能办公助手Pro 的售后服务政策是什么？')
  assert.equal(toolPlan.steps[0].input.params.message, '智能办公助手Pro 的售后服务政策是什么？')
  assert.equal(workflowPlan.steps[0].input.message, '智能办公助手Pro 的售后服务政策是什么？')
  for (const plan of [ragPlan, chatPlan, toolPlan, workflowPlan]) {
    assert.equal(plan.steps[0].input.originalQuestion, '售后怎么样')
    assert.equal(plan.steps[0].input.rewrittenQuestion, '智能办公助手Pro 的售后服务政策是什么？')
    assert.equal(plan.steps[0].input.rewriteApplied, true)
  }
})

test('RulePlanner falls back to chat when AI classification is unavailable or unsafe', async () => {
  const { AgentPlanner, RulePlanner } = loadRuntime()
  const context = createContext('企业版价格是多少？')
  const unavailablePlan = await new AgentPlanner(new RulePlanner({
    classify: async () => ({ capability: 'rag', confidence: 0.95, reason: '模型选择了未授权知识库', input: {} }),
  })).plan(context, ['chat'])
  const lowConfidencePlan = await new AgentPlanner(new RulePlanner({
    classify: async () => ({ capability: 'tool', confidence: 0.49, reason: '模型不确定', input: {} }),
  })).plan(context, ['chat', 'tool'])
  const failedClassifierPlan = await new AgentPlanner(new RulePlanner({
    classify: async () => {
      throw new Error('classifier failed')
    },
  })).plan(context, ['chat', 'rag'])

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
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    capabilities: createContext().capabilities,
    history: [{ role: 'user', content: '我在上海' }],
  }, createContext())

  assert.equal(result.capability, 'tool')
  assert.equal(result.confidence, 0.88)
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
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    capabilities: createContext().capabilities,
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

test('RulePlanner keeps tool and workflow codes from AgentContext instead of AI input', async () => {
  const { RulePlanner } = loadRuntime()
  const context = createContext('执行客户流程')
  const toolPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'tool',
      confidence: 0.9,
      input: { toolCode: 'not_allowed', params: { city: '上海' } },
    }),
  }).plan(context, ['chat', 'tool'])
  const workflowPlan = await new RulePlanner({
    classify: async () => ({
      capability: 'workflow',
      confidence: 0.9,
      input: { workflowCode: 'other_workflow', message: '覆盖消息' },
    }),
  }).plan(context, ['chat', 'workflow'])

  assert.equal(toolPlan.steps[0].input.toolCode, 'weather')
  assert.equal(toolPlan.steps[0].input.params.city, '上海')
  assert.equal(workflowPlan.steps[0].input.workflowCode, 'customer_workflow')
  assert.equal(workflowPlan.steps[0].input.message, '执行客户流程')
  assert.equal(workflowPlan.steps[0].input.originalQuestion, '执行客户流程')
  assert.equal(workflowPlan.steps[0].input.rewrittenQuestion, '执行客户流程')
  assert.equal(workflowPlan.steps[0].input.rewriteApplied, false)
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
  const intentClassifier = readSource('src/ai-runtime/planner/intent-classifier.service.ts')
  const validator = readSource('src/ai-runtime/validator/agent-plan-validator.service.ts')
  const combined = [planner, rulePlanner, intentClassifier, validator].join('\n')

  assert.match(planner, /^\/\/ 协调新版智能体计划生成入口。/)
  assert.match(rulePlanner, /^\/\/ 基于 AI 意图识别生成新版智能体第一版执行计划。/)
  assert.match(intentClassifier, /^\/\/ 使用大模型识别新版智能体本次请求应进入的能力。/)
  assert.match(validator, /^\/\/ 校验新版智能体执行计划是否只使用已授权能力。/)
  assert.doesNotMatch(rulePlanner, /INTENT_PATTERN|价格|多少钱|售价|费用|收费|weather|天气/)
  assert.doesNotMatch(combined, /AgentPlanService|AgentRuntimeService|AgentExecutorService|ChatService/)
  assert.doesNotMatch(combined, /\broute\b/)
})
