const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('agent dto accepts knowledge base ids separately from knowledge tags', () => {
  const dto = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/dto/agent.dto.ts'), 'utf8')

  assert.match(dto, /knowledgeBaseIds\?:\s*string\[\]/)
  assert.match(dto, /@ApiPropertyOptional\(\{\s*description:\s*'绑定知识库ID列表'/)
  assert.match(dto, /knowledgeTags\?:\s*string\[\]/)
})

test('agent service returns and synchronizes knowledge base associations', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')

  assert.match(service, /knowledgeBases:\s*\{\s*select:\s*\{\s*knowledgeBaseId:\s*true/)
  assert.match(service, /knowledgeBaseIds:\s*this\.extractKnowledgeBaseIds\(agent\)/)
  assert.match(service, /private async syncKnowledgeBaseBindings\(agentId:\s*string,\s*knowledgeBaseIds:\s*string\[\]/)
  assert.match(service, /this\.prisma\.aiKnowledgeBaseAgent\.deleteMany\(\{\s*where:\s*\{\s*agentId\s*\}\s*\}\)/)
  assert.match(service, /this\.prisma\.aiKnowledgeBaseAgent\.createMany/)
  assert.match(service, /skipDuplicates:\s*true/)
  assert.match(service, /const knowledgeBaseIds = this\.normalizeKnowledgeBaseIds\(dto\.knowledgeBaseIds\)/)
  assert.match(service, /knowledgeEnabled:\s*dto\.knowledgeBaseIds === undefined \? dto\.knowledgeEnabled : knowledgeBaseIds\.length > 0/)
})
