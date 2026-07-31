const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert')

const root = path.resolve(__dirname, '..')
const llmService = fs.readFileSync(path.join(root, 'src/ai-engine/llm/llm.service.ts'), 'utf8')

test('LLM calls add a final-answer guard to prevent leaking chat role templates', () => {
  assert.match(llmService, /FINAL_ANSWER_GUARD/)
  assert.match(llmService, /不要输出.*user.*assistant.*system/s)
  assert.match(llmService, /withFinalAnswerGuard\(messages\)/)
  assert.match(llmService, /messages:\s*this\.withFinalAnswerGuard\(messages\)/)
  assert.match(llmService, /ROLE_TEMPLATE_STOPS/)
  assert.match(llmService, /stop:\s*ROLE_TEMPLATE_STOPS/)
})
