const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('LLM runtime requires database-resolved model options and has no hardcoded chat fallback', () => {
  const llm = read('src/ai-engine/llm/llm.service.ts')
  const resolver = read('src/ai-engine/model/model-resolver.service.ts')
  const chat = read('src/modules/knowledge-bot/chat/chat.service.ts')
  const workflow = read('src/modules/ai-platform/workflow/workflow.service.ts')
  const reset = read('prisma/reset-ai-data.ts')

  assert.doesNotMatch(llm, /SILICONFLOW_MODEL|Qwen\/Qwen2\.5-7B-Instruct/)
  assert.doesNotMatch(llm, /ModelResolverService/)
  assert.match(llm, /assertModelOptions/)
  assert.match(llm, /options\.model/)
  assert.match(llm, /options\.baseUrl/)
  assert.match(llm, /options\.apiKey/)

  assert.doesNotMatch(resolver, /SILICONFLOW_MODEL|Qwen\/Qwen2\.5-7B-Instruct/)
  assert.match(resolver, /findDefaultModel\('chat'\)/)
  assert.match(resolver, /resolveDefault/)
  assert.match(resolver, /No enabled default chat model config/)

  assert.match(chat, /resolveDefault/)
  assert.match(chat, /agentRuntimeService\.resolve\(body\.agentCode\)/)

  assert.match(workflow, /ModelResolverService/)
  assert.match(workflow, /modelResolver\.resolveDefault/)
  assert.match(workflow, /llmOptions/)

  assert.doesNotMatch(reset, /SILICONFLOW_MODEL|Qwen\/Qwen2\.5-7B-Instruct/)
  assert.match(reset, /aiModelConfig\.findFirst/)
  assert.match(reset, /modelConfigId:\s*defaultChatModel\.id/)
})
