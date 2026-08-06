// 校验 RAG 提示词使用紧凑事实证据而不是原始知识片段。
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('rag prompt uses compact fact evidence instead of raw knowledge chunks', () => {
  const qaService = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-qa.service.ts'), 'utf8')
  const evidenceService = readFileSync(join(rootDir, 'src/ai-runtime/knowledge/knowledge-evidence.service.ts'), 'utf8')

  assert.doesNotMatch(qaService, /sources\.map\(\(item,\s*index\)\s*=>\s*`【知识\$\{index \+ 1\}】\$\{item\.content\}`\)/)
  assert.match(qaService, /const KNOWLEDGE_EVIDENCE_MAX_DISTANCE = \d+\.\d+/)
  assert.match(qaService, /buildEvidence\(sources\)/)
  assert.match(qaService, /buildPromptEvidence\(evidence\.items\)/)
  assert.match(evidenceService, /compactContent\(source\.content/)
  assert.match(qaService, /事实依据：\\n/)
  assert.match(qaService, /不要输出知识片段全文/)
  assert.match(qaService, /不要输出 user\/assistant\/system/)
  assert.doesNotMatch(qaService, /知识片段：\\n/)
})
