// 校验旧 ai-engine 目录已经完成最终删除并由 ai-runtime 模块接管全局注册。
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')
const assert = require('node:assert/strict')

const rootDir = join(__dirname, '..')

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

test('ai-runtime module replaces legacy AIEngineModule in application bootstrap', () => {
  const appModule = read('src/app.module.ts')
  const runtimeModule = read('src/ai-runtime/ai-runtime.module.ts')

  assert.equal(existsSync(join(rootDir, 'src/ai-engine')), false, 'src/ai-engine should be removed')
  assert.match(appModule, /AiRuntimeModule/)
  assert.doesNotMatch(appModule, /AIEngineModule|\.\/ai-engine\//)
  assert.match(runtimeModule, /export class AiRuntimeModule/)
})

test('runtime module registers migrated model rag tool workflow and safety services', () => {
  const runtimeModule = read('src/ai-runtime/ai-runtime.module.ts')

  ;[
    'ModelResolverService',
    'LlmService',
    'SensitiveWordCheckerService',
    'KnowledgeQAService',
    'KnowledgeEvidenceService',
    'KnowledgeAnswerGuardService',
    'VectorStoreService',
    'EmbeddingService',
    'RuntimeToolRegistry',
    'DefaultToolExecutor',
    'WorkflowRuntimeService',
    'WorkflowExecutorService',
    'WorkflowValidatorService',
    'WorkflowRunLoggerService',
  ].forEach((name) => assert.match(runtimeModule, new RegExp(name), `${name} should be registered`))

  assert.doesNotMatch(runtimeModule, /AiOrchestratorService/)
  assert.doesNotMatch(runtimeModule, /ai-engine/)
})

test('source modules no longer import anything from ai-engine', () => {
  const sourceFiles = [
    'src/app.module.ts',
    'src/modules/chat/chat.service.ts',
    'src/modules/agent-chat/agent-chat.module.ts',
    'src/modules/ai-platform/workflow/workflow.service.ts',
    'src/ai-runtime/executor/handlers/workflow.handler.ts',
  ].map(read).join('\n')

  assert.doesNotMatch(sourceFiles, /ai-engine/)
})
