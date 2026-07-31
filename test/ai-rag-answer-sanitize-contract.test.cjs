const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('rag answers are sanitized before saving or streaming to users', () => {
  const orchestrator = readFileSync(join(rootDir, 'src/ai-engine/orchestrator/ai-orchestrator.service.ts'), 'utf8')
  const chatService = readFileSync(join(rootDir, 'src/modules/knowledge-bot/chat/chat.service.ts'), 'utf8')

  assert.match(orchestrator, /export type KnowledgeFact = \{/)
  assert.match(orchestrator, /requiredTerms:\s*string\[\]/)
  assert.match(orchestrator, /knowledgeFacts:\s*KnowledgeFact\[\]/)
  assert.match(orchestrator, /buildKnowledgeFacts\(message,\s*sources\)/)
  assert.match(orchestrator, /extractRequiredTerms/)
  assert.match(orchestrator, /isUsefulKnowledgeFact/)
  assert.match(orchestrator, /isKnowledgeHeadingOrLabel/)
  assert.match(orchestrator, /validateKnowledgeAnswer/)
  assert.match(orchestrator, /buildKnowledgeFallbackAnswer/)
  assert.match(orchestrator, /完整保留事实依据中的数字、期限、条件和否定结论/)
  assert.match(orchestrator, /sanitizeKnowledgeAnswer\(content:\s*string\)/)
  assert.match(orchestrator, /stripCopiedKnowledgeArtifacts/)
  assert.match(orchestrator, /售后服务政策/)
  assert.match(orchestrator, /产品名称/)
  assert.match(orchestrator, /知识片段/)

  assert.match(chatService, /plan\.route === 'knowledge'\s*\?\s*this\.aiOrchestratorService\.ensureKnowledgeAnswer\(rawAnswer,\s*plan\.knowledgeFacts\)/)
  assert.match(chatService, /answer \+= content\s*yield \{ type: 'content', content \}/)
})

test('rag fallback facts exclude headings labels and unrelated source fields', () => {
  const orchestrator = readFileSync(join(rootDir, 'src/ai-engine/orchestrator/ai-orchestrator.service.ts'), 'utf8')

  assert.match(orchestrator, /KNOWLEDGE_HEADING_PATTERN/)
  assert.match(orchestrator, /KNOWLEDGE_LABEL_ONLY_PATTERN/)
  assert.match(orchestrator, /const usefulFacts = facts\.filter\(\(fact\) => this\.isUsefulKnowledgeFact\(fact,\s*question\)\)/)
  assert.match(orchestrator, /return fact\.requiredTerms\.length > 0/)
  assert.match(orchestrator, /this\.hasQuestionOverlap\(fact\.text,\s*question\)/)
  assert.match(orchestrator, /filter\(\(line\) => line && !this\.isKnowledgeHeadingOrLabel\(line\)\)/)
  assert.doesNotMatch(orchestrator, /factLines = facts\.map\(\(fact\) => fact\.text\)/)
})

test('rag fact extraction keeps policy facts without unrelated product fields', async () => {
  require('ts-node/register')
  require('tsconfig-paths/register')
  const { AiOrchestratorService } = require(join(rootDir, 'src/ai-engine/orchestrator/ai-orchestrator.service'))
  const service = new AiOrchestratorService({}, {
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

  const plan = await service.buildCompletion('退货政策是什么', 'knowledge', [], {
    allowedToolCodes: ['search_knowledge'],
  })
  const factText = plan.knowledgeFacts.map((item) => item.text).join('\n')
  const fallback = service.ensureKnowledgeAnswer('您好，相关信息如下：\n1. 售后服务政策\n2. 产品名称：\n3. OA-Pro-2026', plan.knowledgeFacts)

  assert.match(factText, /购买7天内/)
  assert.match(factText, /不支持无理由退款/)
  assert.doesNotMatch(factText, /OA-Pro-2026/)
  assert.doesNotMatch(factText, /支持在线创建/)
  assert.match(fallback, /购买7天内/)
  assert.match(fallback, /不支持无理由退款/)
  assert.doesNotMatch(fallback, /OA-Pro-2026/)
})
