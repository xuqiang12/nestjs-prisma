// 校验 AI V2 知识问答运行时已经从旧 ai-engine 收敛到 ai-runtime。
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')
const assert = require('node:assert/strict')

const rootDir = join(__dirname, '..')

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

test('RAG runtime services live under ai-runtime instead of legacy ai-engine', () => {
  const runtimeFiles = [
    'src/ai-runtime/knowledge/knowledge-qa.service.ts',
    'src/ai-runtime/knowledge/knowledge-evidence.service.ts',
    'src/ai-runtime/knowledge/knowledge-answer-guard.service.ts',
    'src/ai-runtime/knowledge/knowledge.types.ts',
    'src/ai-runtime/knowledge/knowledge-answer.util.ts',
    'src/ai-runtime/vector/vector-store.service.ts',
    'src/ai-runtime/embedding/embedding.service.ts',
    'src/ai-runtime/infra/text-chunker.ts',
  ]
  const legacyFiles = [
    'src/ai-engine/knowledge-qa/knowledge-qa.service.ts',
    'src/ai-engine/knowledge-qa/knowledge-evidence.service.ts',
    'src/ai-engine/knowledge-qa/knowledge-answer-guard.service.ts',
    'src/ai-engine/knowledge-qa/knowledge.types.ts',
    'src/ai-engine/knowledge-answer.util.ts',
    'src/ai-engine/vector/vector-store.service.ts',
    'src/ai-engine/embedding/embedding.service.ts',
    'src/ai-engine/infra/text-chunker.ts',
  ]

  for (const file of runtimeFiles) {
    assert.equal(existsSync(join(rootDir, file)), true, `${file} should exist`)
  }
  for (const file of legacyFiles) {
    assert.equal(existsSync(join(rootDir, file)), false, `${file} should be migrated away`)
  }
})

test('V2 runtime and knowledge modules no longer import legacy RAG services', () => {
  const files = [
    'src/ai-runtime/executor/handlers/rag.handler.ts',
    'src/modules/knowledge/knowledge-base/knowledge-base.service.ts',
    'src/ai-runtime/tools/builtin/search-knowledge.tool.ts',
    'src/ai-runtime/ai-runtime.module.ts',
  ]
  const combined = files.map(read).join('\n')

  assert.doesNotMatch(combined, /ai-engine\/knowledge-qa/)
  assert.doesNotMatch(combined, /ai-engine\/vector/)
  assert.doesNotMatch(combined, /ai-engine\/embedding/)
})
