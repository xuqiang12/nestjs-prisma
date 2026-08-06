// 校验 AI V2 工作流运行时已经从旧 ai-engine 收敛到 ai-runtime。
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')
const assert = require('node:assert/strict')

const rootDir = join(__dirname, '..')

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

test('workflow runtime services live under ai-runtime instead of legacy ai-engine', () => {
  const runtimeFiles = [
    'src/ai-runtime/workflow/workflow-runtime.service.ts',
    'src/ai-runtime/workflow/workflow-executor.service.ts',
    'src/ai-runtime/workflow/workflow-validator.service.ts',
    'src/ai-runtime/workflow/workflow-run-logger.service.ts',
    'src/ai-runtime/workflow/workflow.types.ts',
  ]
  const legacyFiles = [
    'src/ai-engine/workflow/workflow-runtime.service.ts',
    'src/ai-engine/workflow/workflow-executor.service.ts',
    'src/ai-engine/workflow/workflow-validator.service.ts',
    'src/ai-engine/workflow/workflow-run-logger.service.ts',
    'src/ai-engine/workflow/workflow.types.ts',
  ]

  for (const file of runtimeFiles) {
    assert.equal(existsSync(join(rootDir, file)), true, `${file} should exist`)
  }
  for (const file of legacyFiles) {
    assert.equal(existsSync(join(rootDir, file)), false, `${file} should be migrated away`)
  }
})

test('V2 runtime and workflow management no longer import legacy workflow services', () => {
  const files = [
    'src/ai-runtime/executor/handlers/workflow.handler.ts',
    'src/modules/ai-platform/workflow/workflow.service.ts',
    'src/ai-runtime/ai-runtime.module.ts',
  ].map(read).join('\n')

  assert.doesNotMatch(files, /ai-engine\/workflow/)
  assert.match(files, /ai-runtime\/workflow/)
})

test('workflow knowledge node reuses runtime knowledge evidence and guard services', () => {
  const executor = read('src/ai-runtime/workflow/workflow-executor.service.ts')

  assert.match(executor, /KnowledgeEvidenceService/)
  assert.match(executor, /KnowledgeAnswerGuardService/)
  assert.doesNotMatch(executor, /buildKnowledgeFallbackAnswer/)
  assert.doesNotMatch(executor, /validateKnowledgeAnswer/)
  assert.doesNotMatch(executor, /extractKnowledgeNumberTerms/)
})
