// 用接口模拟验证新版智能体能力执行拆分的第五步合同。
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

// 加载能力执行相关运行时类用于接口模拟。
function loadRuntime() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return {
    ...require(join(rootDir, 'src/ai-runtime/capability/capability-registry.service')),
    ...require(join(rootDir, 'src/ai-runtime/executor/agent-capability-executor.service')),
    ...require(join(rootDir, 'src/ai-runtime/executor/handlers/chat.handler')),
    ...require(join(rootDir, 'src/ai-runtime/executor/handlers/rag.handler')),
    ...require(join(rootDir, 'src/ai-runtime/executor/handlers/tool.handler')),
    ...require(join(rootDir, 'src/ai-runtime/executor/handlers/workflow.handler')),
  }
}

// 构造能力执行合同测试所需的智能体上下文。
function createContext(message = '企业版价格是多少？') {
  return {
    agent: { id: 'agent-1', code: 'customer_service', name: '客服智能体', mode: 'chat' },
    user: { id: 'user-1', roles: [], permissions: [] },
    conversation: { id: 'conv-1' },
    history: [{ role: 'user', content: '你们有哪些版本？' }],
    message: { content: message },
    prompt: { id: 'prompt-1', system: '你是客服智能体。' },
    model: { model: 'mock-model', baseUrl: 'http://mock.local', apiKey: 'mock-key' },
    capabilities: {
      knowledgeEnabled: true,
      knowledgeStrict: true,
      knowledgeBaseIds: ['kb-price'],
      knowledgeTags: ['price'],
      toolCodes: ['search_knowledge', 'weather'],
      workflowCode: 'customer_workflow',
    },
    execution: { maxSteps: 1 },
    metadata: { requestId: 'req-1' },
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

test('CapabilityRegistry and Executor dispatch handlers without fixed capability branches', async () => {
  const { CapabilityRegistry, AgentCapabilityExecutor } = loadRuntime()
  const handler = {
    capability: 'chat',
    execute: async function* () {
      yield { type: 'content', payload: { text: 'hello' }, metadata: { requestId: 'req-1', capability: 'chat' } }
    },
  }
  const registry = new CapabilityRegistry([handler])
  const executor = new AgentCapabilityExecutor(registry)
  const events = await collect(executor.execute({
    metadata: { version: 1 },
    strategy: { mode: 'sequential' },
    steps: [{ id: 'step_1', capability: 'chat', input: { message: '你好' } }],
  }, createContext('你好')))

  assert.deepEqual(events.map((event) => event.payload.text), ['hello'])

  const executorSource = readSource('src/ai-runtime/executor/agent-capability-executor.service.ts')
  assert.match(executorSource, /^\/\/ 执行已经校验通过的新版智能体能力计划。/)
  assert.doesNotMatch(executorSource, /switch\s*\(|if\s*\(\s*step\.capability/)
})

test('ChatHandler streams LLM content with AgentContext prompt and history', async () => {
  const { ChatHandler } = loadRuntime()
  const captured = { messages: [] }
  const llmService = {
    streamWithMessages: async function* (messages) {
      captured.messages = messages
      yield '您好，'
      yield '请问需要了解哪个版本？'
    },
  }
  const events = await collect(new ChatHandler(llmService).execute(createContext('你好'), {
    id: 'step_1',
    capability: 'chat',
    input: {
      originalQuestion: '售后怎么样',
      rewrittenQuestion: '智能办公助手Pro 的售后服务政策是什么？',
      rewriteApplied: true,
      message: '智能办公助手Pro 的售后服务政策是什么？',
    },
  }))

  assert.deepEqual(events.map((event) => event.payload.text), ['您好，', '请问需要了解哪个版本？'])
  assert.deepEqual(captured.messages.map((message) => message.role), ['system', 'user', 'user'])
  assert.match(captured.messages[0].content, /你是客服智能体/)
  assert.match(captured.messages[2].content, /用户原始问题：售后怎么样/)
  assert.match(captured.messages[2].content, /上下文改写问题：智能办公助手Pro 的售后服务政策是什么？/)
})

test('RagHandler answers customer price questions from knowledge QA result and emits sources', async () => {
  const { RagHandler } = loadRuntime()
  const captured = { context: null }
  const knowledgeQAService = {
    answer: async (context) => {
      captured.context = context
      return {
        answer: '企业版价格为4999元/年。',
        sources: [{ id: 'doc-price', content: '企业版价格为4999元/年。', distance: 0.2 }],
      }
    },
  }
  const events = await collect(new RagHandler(knowledgeQAService).execute(createContext(), {
    id: 'step_1',
    capability: 'rag',
    input: {
      originalQuestion: '售后怎么样',
      rewrittenQuestion: '智能办公助手Pro 的售后服务政策是什么？',
      rewriteApplied: true,
      query: '智能办公助手Pro 的售后服务政策是什么？',
    },
  }))

  assert.equal(events[0].payload.text, '企业版价格为4999元/年。')
  assert.deepEqual(events[1].payload.sources, [{ id: 'doc-price', content: '企业版价格为4999元/年。', distance: 0.2 }])
  assert.equal(captured.context.question, '智能办公助手Pro 的售后服务政策是什么？')
  assert.equal(captured.context.originalQuestion, '售后怎么样')
  assert.equal(captured.context.rewrittenQuestion, '智能办公助手Pro 的售后服务政策是什么？')
  assert.equal(captured.context.rewriteApplied, true)
  assert.deepEqual(captured.context.knowledgeBaseIds, ['kb-price'])
  assert.deepEqual(captured.context.allowedToolCodes, ['search_knowledge', 'weather'])
  assert.equal(captured.context.knowledgeStrict, true)
})

test('ToolHandler executes only the tool requested by the validated step', async () => {
  const { ToolHandler } = loadRuntime()
  const calls = []
  const toolExecutor = {
    execute: async (toolCode, params) => {
      calls.push({ toolCode, params })
      return { city: '上海', temperature: '30℃' }
    },
  }
  const events = await collect(new ToolHandler(toolExecutor).execute(createContext('查一下天气'), {
    id: 'step_1',
    capability: 'tool',
    input: {
      toolCode: 'weather',
      originalQuestion: '天气呢',
      rewrittenQuestion: '上海今天的天气怎么样？',
      rewriteApplied: true,
      params: {
        city: '上海',
        message: '上海今天的天气怎么样？',
        originalQuestion: '天气呢',
        rewrittenQuestion: '上海今天的天气怎么样？',
        rewriteApplied: true,
      },
    },
  }))

  assert.deepEqual(calls, [{
    toolCode: 'weather',
    params: {
      city: '上海',
      message: '上海今天的天气怎么样？',
      originalQuestion: '天气呢',
      rewrittenQuestion: '上海今天的天气怎么样？',
      rewriteApplied: true,
    },
  }])
  assert.equal(events[0].type, 'tool_start')
  assert.equal(events[1].type, 'tool_done')
})

test('WorkflowHandler maps workflow stream events into AgentEvent envelope', async () => {
  const { WorkflowHandler } = loadRuntime()
  const workflowRuntime = {
    stream: async function* (workflowCode, input) {
      assert.equal(workflowCode, 'customer_workflow')
      assert.equal(input.message, '智能办公助手Pro 的售后服务政策是什么？')
      assert.equal(input.originalQuestion, '售后怎么样')
      assert.equal(input.rewrittenQuestion, '智能办公助手Pro 的售后服务政策是什么？')
      assert.equal(input.rewriteApplied, true)
      yield { type: 'workflow_start', runId: 'run-1', workflowCode: 'customer_workflow' }
      yield { type: 'content', content: '工作流回答' }
      yield { type: 'sources', sources: [{ id: 'workflow-source' }] }
      yield { type: 'workflow_done', runId: 'run-1', answer: '工作流回答' }
    },
  }
  const events = await collect(new WorkflowHandler(workflowRuntime).execute(createContext('执行工作流'), {
    id: 'step_1',
    capability: 'workflow',
    input: {
      workflowCode: 'customer_workflow',
      originalQuestion: '售后怎么样',
      rewrittenQuestion: '智能办公助手Pro 的售后服务政策是什么？',
      rewriteApplied: true,
      message: '智能办公助手Pro 的售后服务政策是什么？',
    },
  }))

  assert.deepEqual(events.map((event) => event.type), ['workflow_start', 'content', 'sources', 'workflow_done'])
  assert.equal(events[1].payload.text, '工作流回答')
  assert.deepEqual(events[2].payload.sources, [{ id: 'workflow-source' }])
})

test('Capability handlers do not reference old agent runtime main services', () => {
  const files = [
    'src/ai-runtime/capability/capability-registry.service.ts',
    'src/ai-runtime/executor/agent-capability-executor.service.ts',
    'src/ai-runtime/executor/handlers/chat.handler.ts',
    'src/ai-runtime/executor/handlers/rag.handler.ts',
    'src/ai-runtime/executor/handlers/tool.handler.ts',
    'src/ai-runtime/executor/handlers/workflow.handler.ts',
  ].map(readSource).join('\n')

  assert.doesNotMatch(files, /AgentRuntimeService|AgentPlanService|AgentExecutorService|ChatService/)
  assert.match(files, /KnowledgeQAService/)
  assert.doesNotMatch(files, /modelResolver\.resolve|process\.env|default model/i)
})
