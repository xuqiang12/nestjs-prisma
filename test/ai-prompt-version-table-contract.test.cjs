const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

const promptPage = fs.readFileSync(
  path.join(rootDir, '../fullstack-admin-serve/vue-element-admin-dev/src/views/AIEngine/prompt/index.vue'),
  'utf8',
)
const schema = read('prisma/schema.prisma')
const promptDto = read('src/modules/ai-config/prompt/dto/prompt.dto.ts')
const promptService = read('src/modules/ai-config/prompt/prompt.service.ts')
const promptController = read('src/modules/ai-config/prompt/prompt.controller.ts')
const promptApi = fs.readFileSync(
  path.join(rootDir, '../fullstack-admin-serve/vue-element-admin-dev/src/api/ai.js'),
  'utf8',
)
const resetAiData = read('prisma/reset-ai-data.ts')

const aiPromptBlock = schema.match(/model AiPrompt \{[\s\S]*?\n\}/)
const resetAiPromptBlock = resetAiData.match(/prisma\.aiPrompt\.createMany\(\{[\s\S]*?\n  \}\)/)

assert(promptPage.includes('ElementTable'), 'prompt page should import common-utils-kit ElementTable')
assert(promptPage.includes('<element-table'), 'prompt page should render ElementTable')
assert(!promptPage.includes('<el-table'), 'prompt page should not render raw el-table')
assert(promptPage.includes('type: "switch"'), 'prompt status column should use ElementTable switch column')
assert(!promptPage.includes('handleStatus(row)'), 'prompt actions should not include a status text button')
assert(promptPage.includes('{ lable: "编辑", flag: "edit" }'), 'prompt actions should include edit button')
assert(promptPage.includes('{ lable: "删除", flag: "delete" }'), 'prompt actions should include delete button')
assert(promptPage.includes('@setStatus="handleSetStatus"'), 'prompt switch should persist status changes')
assert(!promptPage.includes('label="版本"'), 'prompt page should not display a version field')
assert(!promptPage.includes('form.version'), 'prompt form should not submit a version value')

assert(aiPromptBlock, 'AiPrompt model should exist')
assert(!aiPromptBlock[0].includes('version'), 'AiPrompt model should not include version')
assert(resetAiPromptBlock, 'reset ai data should seed prompts')
assert(!resetAiPromptBlock[0].includes('version'), 'reset ai prompt seed data should not include version')
assert(!promptDto.includes('version'), 'prompt dto should not expose version')
assert(!promptService.includes('version:'), 'prompt service should not write version')
assert(promptDto.includes('DeletePromptDto'), 'prompt dto should expose delete dto')
assert(promptService.includes('async delete'), 'prompt service should support delete')
assert(promptController.includes("@Post('delete')"), 'prompt controller should expose delete endpoint')
assert(promptApi.includes('deletePrompt'), 'prompt frontend api should expose deletePrompt')

process.stdout.write('ok - ai prompt version and table contract\n')
