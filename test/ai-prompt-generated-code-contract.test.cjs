const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const promptDto = fs.readFileSync(path.join(rootDir, 'src/modules/ai-config/prompt/dto/prompt.dto.ts'), 'utf8')
const promptService = fs.readFileSync(path.join(rootDir, 'src/modules/ai-config/prompt/prompt.service.ts'), 'utf8')
const promptPage = fs.readFileSync(
  path.join(rootDir, '../fullstack-admin-serve/vue-element-admin-dev/src/views/AIEngine/prompt/index.vue'),
  'utf8',
)

assert(!promptDto.includes("code: string"), 'create/update prompt dto should not expose writable code')
assert(promptService.includes('nextPromptCode'), 'prompt service should request generated prompt code on create')
assert(!promptService.includes('ensureUniqueCode(dto.code'), 'prompt create should not require user-provided code')
assert(!promptService.includes('code: dto.code'), 'prompt update should not modify code')
assert(
  promptPage.includes('v-if="form.id"') && promptPage.includes(':disabled="true"'),
  'prompt page should only show disabled code when editing',
)

process.stdout.write('ok - ai prompt generated code contract\n')
