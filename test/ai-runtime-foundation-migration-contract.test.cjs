// 校验 AI V2 运行时底座服务已经从旧 ai-engine 收敛到 ai-runtime。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))
const listSourceFiles = (dir) => {
  const absoluteDir = path.join(root, dir)
  if (!fs.existsSync(absoluteDir)) {
    return []
  }
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(dir, entry.name).replace(/\\/g, '/')
    if (entry.isDirectory()) {
      return listSourceFiles(relativePath)
    }
    return /\.(ts|js|vue)$/.test(entry.name) ? [relativePath] : []
  })
}

test('runtime foundation services live under ai-runtime instead of legacy ai-engine', () => {
  [
    'src/ai-runtime/model/model-resolver.service.ts',
    'src/ai-runtime/llm/llm.service.ts',
    'src/ai-runtime/safety/sensitive-word-checker.service.ts',
  ].forEach((file) => assert.equal(exists(file), true, `${file} should exist`));

  [
    'src/ai-engine/model/model-resolver.service.ts',
    'src/ai-engine/llm/llm.service.ts',
    'src/ai-engine/safety/sensitive-word-checker.service.ts',
    'src/ai-runtime/llm/runtime-llm-client.service.ts',
  ].forEach((file) => assert.equal(exists(file), false, `${file} should be removed after migration`))
})

test('V2 entry and runtime code no longer import legacy model llm or safety services', () => {
  const files = [
    ...listSourceFiles('src/modules/chat'),
    ...listSourceFiles('src/modules/agent-chat'),
    ...listSourceFiles('src/ai-runtime'),
  ]

  files.forEach((file) => {
    const content = read(file)
    assert.doesNotMatch(
      content,
      /from ['"].*ai-engine\/(?:model|llm|safety)\//,
      `${file} should not import migrated foundation services from ai-engine`,
    )
  })
})

test('intent classifier uses the shared runtime LLM service', () => {
  const classifier = read('src/ai-runtime/planner/intent-classifier.service.ts')
  const module = read('src/modules/agent-chat/agent-chat.module.ts')

  assert.match(classifier, /LlmService/)
  assert.doesNotMatch(classifier, /RuntimeLlmClientService/)
  assert.match(module, /LlmService/)
  assert.doesNotMatch(module, /RuntimeLlmClientService/)
})
