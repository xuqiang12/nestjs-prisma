const test = require('node:test')
const assert = require('node:assert')
const path = require('path')

const root = path.resolve(__dirname, '..')

function createGraph() {
  return {
    nodes: [
      { nodeKey: 'start', type: 'start', name: '接收问题', config: { inputField: 'question' }, sortNo: 1 },
      { nodeKey: 'knowledge', type: 'knowledge', name: '检索知识库', config: { queryField: 'question', outputField: 'sources', limit: 5 }, sortNo: 2 },
      { nodeKey: 'prompt', type: 'prompt', name: '生成提示', config: { promptId: 'prompt-1', outputField: 'systemPrompt' }, sortNo: 3 },
      { nodeKey: 'llm', type: 'llm', name: '生成答复', config: { systemPromptField: 'systemPrompt', userMessageField: 'question', outputField: 'answer' }, sortNo: 4 },
      { nodeKey: 'output', type: 'output', name: '输出答案', config: { outputField: 'answer' }, sortNo: 5 },
    ],
    edges: [
      { fromNodeKey: 'start', toNodeKey: 'knowledge', sortNo: 1 },
      { fromNodeKey: 'knowledge', toNodeKey: 'prompt', sortNo: 2 },
      { fromNodeKey: 'prompt', toNodeKey: 'llm', sortNo: 3 },
      { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 4 },
    ],
  }
}

function createExecutor(overrides = {}) {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const { WorkflowExecutorService } = require(path.join(root, 'src/ai-runtime/workflow/workflow-executor.service'))
  const { KnowledgeEvidenceService } = require(path.join(root, 'src/ai-runtime/knowledge/knowledge-evidence.service'))
  const { KnowledgeAnswerGuardService } = require(path.join(root, 'src/ai-runtime/knowledge/knowledge-answer-guard.service'))
  const prompt = overrides.prompt || '你是企业知识库问答助手。优先依据知识库检索结果回答。'
  const sources = overrides.sources || [{
    id: 'doc-1',
    distance: 0.2,
    metadata: {},
    content: [
      '产品名称：智能办公助手Pro',
      '售价：',
      '基础版本：1999元/年',
      '企业版本：4999元/年',
    ].join('\n'),
  }]
  const captured = { query: '', messages: [] }
  const prisma = {
    aiPrompt: {
      findFirst: async () => ({ id: 'prompt-1', content: prompt }),
    },
  }
  const vectorStore = {
    similaritySearch: async (query) => {
      captured.query = query
      return sources
    },
  }
  const llmService = {
    invokeWithMessages: async (messages) => {
      captured.messages = messages
      return overrides.answer || '基础版本的价格是1999元/年，企业版本的价格是4999元/年。'
    },
    streamWithMessages: async function* (messages) {
      captured.messages = messages
      yield overrides.streamPart1 || '基础版本的价格是1111元/年，'
      yield overrides.streamPart2 || '企业版本的价格是4111元/年。'
    },
  }
  const runLogger = {
    startRun: async () => ({ id: 'run-1' }),
    logStep: async () => undefined,
    finishRun: async () => undefined,
    failRun: async () => undefined,
  }
  const executor = new WorkflowExecutorService(
    prisma,
    vectorStore,
    llmService,
    {},
    runLogger,
    new KnowledgeEvidenceService(),
    new KnowledgeAnswerGuardService(),
  )
  return { executor, captured }
}

function createInput() {
  return {
    message: '智能办公助手Pro多少钱？',
    userId: 'user-1',
    history: [
      { role: 'user', content: '智能办公助手Pro多少钱？' },
      { role: 'assistant', content: '基础版本价格为1111元/年，企业版本价格为2222元/年。' },
    ],
    agentCode: 'knowledge_qa_agent',
    workflowCode: 'knowledge_service_flow',
    allowedToolCodes: ['search_knowledge'],
    knowledgeStrict: false,
    knowledgeTags: [],
    knowledgeBaseIds: [],
    llmOptions: {},
  }
}

test('workflow knowledge llm uses retrieved facts and excludes stale assistant history', async () => {
  const { executor, captured } = createExecutor()

  await executor.execute(createGraph(), createInput())
  const messagesText = captured.messages.map((message) => message.content).join('\n')

  assert.match(captured.query, /智能办公助手Pro多少钱/)
  assert.doesNotMatch(captured.query, /1111元/)
  assert.deepEqual(captured.messages.map((message) => message.role), ['system', 'user'])
  assert.match(messagesText, /基础版本：1999元\/年/)
  assert.match(messagesText, /企业版本：4999元\/年/)
  assert.doesNotMatch(messagesText, /1111元\/年/)
  assert.doesNotMatch(messagesText, /2222元\/年/)
})

test('workflow knowledge stream buffers model chunks and emits checked facts', async () => {
  const { executor } = createExecutor()
  const events = []

  for await (const event of executor.streamExecute(createGraph(), createInput())) {
    events.push(event)
  }
  const contentEvents = events.filter((event) => event.type === 'content')
  const doneEvent = events.find((event) => event.type === 'workflow_done')

  assert.deepEqual(contentEvents, [
    { type: 'content', content: '根据知识库，相关信息如下：\n\n售价：\n基础版本：1999元/年\n企业版本：4999元/年' },
  ])
  assert.ok(doneEvent)
  assert.match(doneEvent.answer, /1999元\/年/)
  assert.match(doneEvent.answer, /4999元\/年/)
  assert.doesNotMatch(doneEvent.answer, /1111元/)
  assert.doesNotMatch(doneEvent.answer, /4111元/)
})
