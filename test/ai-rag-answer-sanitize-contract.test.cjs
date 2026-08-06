// 校验知识库问答答案清洗、事实约束和新版运行时接入合同。
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

function createKnowledgeQAService(vectorStoreService, llmService = {}) {
  const { KnowledgeQAService } = require(join(rootDir, 'src/ai-runtime/knowledge/knowledge-qa.service'))
  const { KnowledgeEvidenceService } = require(join(rootDir, 'src/ai-runtime/knowledge/knowledge-evidence.service'))
  const { KnowledgeAnswerGuardService } = require(join(rootDir, 'src/ai-runtime/knowledge/knowledge-answer-guard.service'))
  return new KnowledgeQAService(
    { invokeWithMessages: async () => '', ...llmService },
    vectorStoreService,
    new KnowledgeEvidenceService(),
    new KnowledgeAnswerGuardService(),
  )
}

test('rag answers are sanitized before saving or streaming to users', () => {
  const qaService = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-qa.service.ts'), 'utf8')
  const evidenceService = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-evidence.service.ts'), 'utf8')
  const guardService = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-answer-guard.service.ts'), 'utf8')
  const knowledgeTypes = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge.types.ts'), 'utf8')
  const ragHandler = readFileSync(join(rootDir, 'src/ai-runtime/executor/handlers/rag.handler.ts'), 'utf8')
  const agentComposer = readFileSync(join(rootDir, 'src/ai-runtime/composer/agent-composer.service.ts'), 'utf8')
  const answerUtil = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-answer.util.ts'), 'utf8')

  assert.match(knowledgeTypes, /KnowledgeFact/)
  assert.match(answerUtil, /requiredTerms:\s*string\[\]/)
  assert.match(knowledgeTypes, /knowledgeFacts:\s*KnowledgeFact\[\]/)
  assert.match(evidenceService, /buildFacts\(sources/)
  assert.match(evidenceService, /extractRequiredTerms/)
  assert.match(answerUtil, /validateKnowledgeAnswer/)
  assert.match(answerUtil, /buildKnowledgeFallbackAnswer/)
  assert.doesNotMatch(answerUtil, /KNOWLEDGE_QUERY_STOP_WORDS/)
  assert.doesNotMatch(answerUtil, /isQuestionAskingForValue/)
  assert.match(qaService, /完整保留事实依据中的数字、期限、条件和否定结论/)
  assert.match(qaService, /sanitizeAnswer\(content:\s*string\)/)
  assert.match(guardService, /stripCopiedKnowledgeArtifacts/)
  assert.match(guardService, /知识片段/)
  assert.doesNotMatch(evidenceService, /KNOWLEDGE_EVIDENCE_MAX_LINES/)
  assert.doesNotMatch(evidenceService, /KNOWLEDGE_LABEL_ONLY_PATTERN/)
  assert.doesNotMatch(evidenceService, /KNOWLEDGE_HEADING_PATTERN/)
  assert.doesNotMatch(evidenceService, /isUsefulKnowledgeFact/)

  assert.match(ragHandler, /knowledgeQAService\.answer/)
  assert.match(agentComposer, /collectAssistantResult/)
})

test('rag facts use generic chunk content without sample-specific filters', () => {
  const evidenceService = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-evidence.service.ts'), 'utf8')

  assert.doesNotMatch(evidenceService, /产品名称\|产品型号\|产品功能/)
  assert.doesNotMatch(evidenceService, /售价\|基础版本\|企业版本/)
  assert.doesNotMatch(evidenceService, /\.slice\(0,\s*KNOWLEDGE_EVIDENCE_MAX_LINES\)/)
  assert.doesNotMatch(evidenceService, /requiredTerms\.length > 0 && this\.hasQuestionOverlap/)
  assert.match(evidenceService, /source\.content/)
})

test('rag fact extraction keeps relevant policy facts without fixed field lists', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const service = createKnowledgeQAService({
    similaritySearch: async () => [{
      id: 'doc-1',
      distance: 0.2,
      metadata: {},
      content: [
        '售后服务政策',
        '一、退货政策',
        '购买7天内：如果产品未激活，可以申请退款。',
        '购买超过7天：不支持无理由退款。',
        '产品名称：',
        '智能办公助手Pro',
        '产品型号：',
        'OA-Pro-2026',
        '产品功能：',
        '支持在线创建、编辑、共享企业文档',
      ].join('\n'),
    }],
  })

  const plan = await service.buildCompletion({
    question: '退货政策是什么',
    history: [],
    allowedToolCodes: ['search_knowledge'],
  })
  const factText = plan.knowledgeFacts.map((item) => item.text).join('\n')
  const fallback = service.ensureAnswer('', plan.knowledgeFacts)

  assert.match(factText, /购买7天内/)
  assert.match(factText, /不支持无理由退款/)
  assert.match(fallback, /购买7天内/)
  assert.match(fallback, /不支持无理由退款/)
})

test('rag fact extraction keeps later structured values instead of truncating to leading lines', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const service = createKnowledgeQAService({
    similaritySearch: async () => [{
      id: 'doc-1',
      distance: 0.2,
      metadata: {},
      content: [
        '产品名称：智能办公助手Pro',
        '产品型号：',
        'OA-Pro-2026',
        '产品功能：',
        '1. 文档管理',
        '支持在线创建、编辑、共享企业文档。',
        '2. AI助手',
        '支持智能问答、内容总结、会议纪要生成。',
        '3. 权限管理',
        '支持管理员设置用户访问权限。',
        '适用范围：',
        '适用于企业内部办公场景，包括：',
        '- 文件管理',
        '- 企业知识查询',
        '- 日常办公协作',
        '售价：',
        '基础版本：',
        '1999元/年',
        '企业版本：',
        '4999元/年',
        '服务期限：',
        '购买后提供一年技术支持服务。',
      ].join('\n'),
    }],
  })

  const plan = await service.buildCompletion({
    question: '智能办公助手Pro多少钱？',
    history: [],
    allowedToolCodes: ['search_knowledge'],
  })
  const factText = plan.knowledgeFacts.map((item) => item.text).join('\n')
  const fallback = service.ensureAnswer('', plan.knowledgeFacts)

  assert.match(factText, /产品名称：智能办公助手Pro/)
  assert.match(factText, /售价/)
  assert.match(factText, /基础版本/)
  assert.match(factText, /1999元\/年/)
  assert.match(factText, /企业版本/)
  assert.match(factText, /4999元\/年/)
  assert.match(fallback, /1999元\/年/)
  assert.match(fallback, /4999元\/年/)
})

test('knowledge prompts exclude assistant history so stale answers do not override retrieved facts', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const service = createKnowledgeQAService({
    similaritySearch: async () => [{
      id: 'doc-1',
      distance: 0.2,
      metadata: {},
      content: [
        '产品名称：智能办公助手Pro',
        '售价：',
        '基础版本：1999元/年',
        '企业版本：4999元/年',
      ].join('\n'),
    }],
  })

  const plan = await service.buildCompletion({
    question: '智能办公助手Pro多少钱？',
    history: [
      { role: 'user', content: '智能办公助手Pro多少钱？' },
      { role: 'assistant', content: '基础版本价格为1111元/年，企业版本价格为2222元/年。' },
    ],
    allowedToolCodes: ['search_knowledge'],
  })
  const messagesText = plan.messages.map((message) => message.content).join('\n')

  assert.equal(plan.route, 'knowledge')
  assert.match(messagesText, /基础版本：1999元\/年/)
  assert.match(messagesText, /企业版本：4999元\/年/)
  assert.doesNotMatch(messagesText, /1111元\/年/)
  assert.doesNotMatch(messagesText, /2222元\/年/)
  assert.deepEqual(plan.messages.map((message) => message.role), ['system', 'user'])
})

test('knowledge retrieval uses recent user context to make follow-up questions searchable', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  let receivedQuery = ''
  const service = createKnowledgeQAService({
    similaritySearch: async (query) => {
      receivedQuery = query
      return [{
        id: 'doc-1',
        distance: 0.2,
        metadata: {},
        content: '企业版本：4999元/年',
      }]
    },
  })

  const plan = await service.buildCompletion({
    question: '企业版呢？',
    history: [
      { role: 'user', content: '智能办公助手Pro多少钱？' },
      { role: 'assistant', content: '基础版本价格为1111元/年。' },
    ],
    allowedToolCodes: ['search_knowledge'],
  })
  const finalUserMessage = plan.messages[plan.messages.length - 1]

  assert.match(receivedQuery, /智能办公助手Pro多少钱/)
  assert.match(receivedQuery, /企业版呢/)
  assert.doesNotMatch(receivedQuery, /1111元/)
  assert.equal(finalUserMessage.role, 'user')
  assert.match(finalUserMessage.content, /智能办公助手Pro多少钱/)
  assert.match(finalUserMessage.content, /企业版呢/)
})

test('knowledge answer fallback rejects numeric claims that are not in retrieved facts', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const service = createKnowledgeQAService({
    similaritySearch: async () => [{
      id: 'doc-1',
      distance: 0.2,
      metadata: {},
      content: [
        '产品名称：智能办公助手Pro',
        '售价：',
        '基础版本：1999元/年',
        '企业版本：4999元/年',
      ].join('\n'),
    }],
  })

  const plan = await service.buildCompletion({
    question: '智能办公助手Pro多少钱？',
    history: [],
    allowedToolCodes: ['search_knowledge'],
  })
  const answer = service.ensureAnswer(
    '基础版本的价格是1111元/年，企业版本的价格是4111元/年。',
    plan.knowledgeFacts,
  )
  const validAnswer = service.ensureAnswer(
    '基础版本的价格是1999元/年，企业版本的价格是4999元/年。',
    plan.knowledgeFacts,
  )

  assert.match(answer, /1999元\/年/)
  assert.match(answer, /4999元\/年/)
  assert.doesNotMatch(answer, /1111元/)
  assert.doesNotMatch(answer, /4111元/)
  assert.equal(validAnswer, '基础版本的价格是1999元/年，企业版本的价格是4999元/年。')
})

test('knowledge fallback focuses facts by unsupported numeric unit without business-specific filters', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const service = createKnowledgeQAService({
    similaritySearch: async () => [{
      id: 'doc-1',
      distance: 0.2,
      metadata: {},
      content: [
        '产品名称：智能办公助手Pro',
        '产品功能：',
        '1. 文档管理',
        '支持在线创建、编辑、共享企业文档。',
        '售价：',
        '基础版本：',
        '1999元/年',
        '企业版本：',
        '4999元/年',
        '服务期限：',
        '购买后提供一年技术支持服务。',
      ].join('\n'),
    }],
  })

  const plan = await service.buildCompletion({
    question: '智能办公助手Pro基础版多少钱？',
    history: [],
    allowedToolCodes: ['search_knowledge'],
  })
  const answer = service.ensureAnswer(
    '基础版价格是1111元/年。',
    plan.knowledgeFacts,
    '智能办公助手Pro基础版多少钱？',
  )

  assert.match(answer, /基础版本/)
  assert.match(answer, /1999元\/年/)
  assert.match(answer, /企业版本/)
  assert.match(answer, /4999元\/年/)
  assert.doesNotMatch(answer, /文档管理/)
  assert.doesNotMatch(answer, /服务期限/)
})

test('knowledge qa returns the checked answer used by v2 rag handler', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const { KnowledgeQAService } = require(join(rootDir, 'src/ai-runtime/knowledge/knowledge-qa.service'))
  const { KnowledgeEvidenceService } = require(join(rootDir, 'src/ai-runtime/knowledge/knowledge-evidence.service'))
  const { KnowledgeAnswerGuardService } = require(join(rootDir, 'src/ai-runtime/knowledge/knowledge-answer-guard.service'))
  const service = new KnowledgeQAService(
    { invokeWithMessages: async () => '基础版本的价格是1111元/年，企业版本的价格是4111元/年。' },
    {
      similaritySearch: async () => [{
        id: 'doc-1',
        distance: 0.2,
        metadata: {},
        content: '基础版本：1999元/年\n企业版本：4999元/年',
      }],
    },
    new KnowledgeEvidenceService(),
    new KnowledgeAnswerGuardService(),
  )

  const result = await service.answer({
    question: '智能办公助手Pro多少钱？',
    history: [],
    allowedToolCodes: ['search_knowledge'],
  })

  assert.match(result.answer, /基础版本：1999元\/年/)
  assert.match(result.answer, /企业版本：4999元\/年/)
  assert.doesNotMatch(result.answer, /1111元|4111元/)
  assert.deepEqual(result.sources.map((source) => source.id), ['doc-1'])
})
