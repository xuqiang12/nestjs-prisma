// 校验运行时模型配置从数据库模型中心解析。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('runtime resolves model config instead of hardcoding SiliconFlow only', () => {
  const resolver = read('src/ai-runtime/model/model-resolver.service.ts')
  const llm = read('src/ai-runtime/llm/llm.service.ts')
  const contextBuilder = read('src/ai-runtime/context/agent-context.builder.ts')

  assert.match(resolver, /class ModelResolverService/)
  assert.match(resolver, /findFirst[\s\S]*aiModelConfig/)
  assert.match(resolver, /id,[\s\S]*modelType:\s*'chat'/)
  assert.match(resolver, /isDefault:\s*true/)
  assert.match(resolver, /modelType:\s*'chat'/)
  assert.match(resolver, /provider:\s*{[\s\S]*select:\s*{[\s\S]*baseUrl:\s*true[\s\S]*apiKeyEnv:\s*true/)
  assert.match(resolver, /process\.env\[.*provider\.apiKeyEnv/)
  assert.match(llm, /baseURL:\s*options\.baseUrl/)
  assert.match(llm, /apiKey:\s*options\.apiKey/)
  assert.doesNotMatch(llm, /baseURL:\s*process\.env\.SILICONFLOW_BASE_URL/)
  assert.match(contextBuilder, /modelConfigId/)
  assert.match(contextBuilder, /modelResolver\.resolve/)
})
