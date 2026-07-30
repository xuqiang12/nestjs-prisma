const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const adminRoot = path.resolve(rootDir, '../fullstack-admin-serve/vue-element-admin-dev')

const read = (file) => fs.readFileSync(path.join(rootDir, file), 'utf8')
const readAdmin = (file) => fs.readFileSync(path.join(adminRoot, file), 'utf8')

const dto = read('src/modules/ai-platform/agent/dto/agent.dto.ts')
const service = read('src/modules/ai-platform/agent/agent.service.ts')
const page = readAdmin('src/views/AIEngine/agent/index.vue')

assert(!dto.includes('code: string'), 'create agent dto should not require editable code')
assert(dto.includes('code?: string'), 'update agent dto may carry readonly code but it must be optional')
assert(service.includes('private async nextAgentCode()'), 'agent service should generate the next agent code')
assert(service.includes("'ZNT'"), 'agent code should use ZNT prefix')
assert(service.includes('padStart(16'), 'agent code should use a 16 digit sequence')
assert(service.includes('code: await this.nextAgentCode()'), 'create should use generated code')
assert(!service.includes('await this.ensureUniqueCode(dto.code)'), 'create should not validate user supplied code')
assert(!service.includes('if (dto.code && dto.code !== agent.code)'), 'update should not allow changing code')
assert(!service.includes('code: dto.code,'), 'agent update data should not write dto.code')
assert(!page.includes('code: [{ required: true'), 'agent page should not require manual code input')
assert(page.includes(':disabled="true"') && page.includes('自动生成'), 'agent page should show readonly auto generated code')

process.stdout.write('ok - ai agent code generation contract\n')
