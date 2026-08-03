const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert')

const root = path.resolve(__dirname, '..')
const llmService = fs.readFileSync(path.join(root, 'src/ai-engine/llm/llm.service.ts'), 'utf8')
const orchestratorService = fs.readFileSync(path.join(root, 'src/ai-engine/orchestrator/ai-orchestrator.service.ts'), 'utf8')

test('LLM output guard is opt-in instead of global default', () => {
  assert.match(llmService, /FINAL_ANSWER_GUARD/)
  assert.match(llmService, /不要输出.*user.*assistant.*system/s)
  assert.match(llmService, /finalAnswerGuard\?:\s*boolean/)
  assert.match(llmService, /roleTemplateStops\?:\s*boolean/)
  assert.match(llmService, /withFinalAnswerGuard\(messages\)/)
  assert.match(llmService, /messages:\s*options\.finalAnswerGuard\s*\?\s*this\.withFinalAnswerGuard\(messages\)\s*:\s*messages/)
  assert.match(llmService, /ROLE_TEMPLATE_STOPS/)
  assert.match(llmService, /options\.roleTemplateStops\s*\?\s*\{\s*stop:\s*ROLE_TEMPLATE_STOPS\s*\}/)
  assert.doesNotMatch(llmService, /\n\s*stop:\s*ROLE_TEMPLATE_STOPS,\s*\n/)
})

test('chat and knowledge final-answer calls explicitly enable output guard', () => {
  assert.match(orchestratorService, /finalAnswerGuard:\s*true/)
  assert.match(orchestratorService, /roleTemplateStops:\s*true/)
})
