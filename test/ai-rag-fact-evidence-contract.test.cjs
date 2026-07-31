const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('rag prompt uses compact fact evidence instead of raw knowledge chunks', () => {
  const orchestrator = readFileSync(join(rootDir, 'src/ai-engine/orchestrator/ai-orchestrator.service.ts'), 'utf8')

  assert.doesNotMatch(orchestrator, /sources\.map\(\(item,\s*index\)\s*=>\s*`【知识\$\{index \+ 1\}】\$\{item\.content\}`\)/)
  assert.match(orchestrator, /const KNOWLEDGE_EVIDENCE_MAX_DISTANCE = \d+\.\d+/)
  assert.match(orchestrator, /buildKnowledgeEvidence\(knowledgeFacts\)/)
  assert.match(orchestrator, /compactKnowledgeContent\(source\.content\)/)
  assert.match(orchestrator, /事实依据：\\n/)
  assert.match(orchestrator, /不要输出知识片段全文/)
  assert.match(orchestrator, /不要输出 user\/assistant\/system/)
  assert.doesNotMatch(orchestrator, /知识片段：\\n/)
})
