const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const schema = fs.readFileSync(path.join(rootDir, 'prisma/schema.prisma'), 'utf8')
const agentDto = fs.readFileSync(path.join(rootDir, 'src/modules/ai-platform/agent/dto/agent.dto.ts'), 'utf8')
const skillPackageDto = fs.readFileSync(path.join(rootDir, 'src/modules/ai-platform/skill-package/dto/skill-package.dto.ts'), 'utf8')
const promptService = fs.readFileSync(path.join(rootDir, 'src/modules/ai-platform/prompt/prompt.service.ts'), 'utf8')
const migrationSql = fs.readFileSync(
  path.join(rootDir, 'prisma/migrations/20260729010000_use_snowflake_ids/migration.sql'),
  'utf8',
)
const agentPage = fs.readFileSync(
  path.join(rootDir, '../fullstack-admin-serve/vue-element-admin-dev/src/views/AIEngine/agent/index.vue'),
  'utf8',
)
const workflowPage = fs.readFileSync(
  path.join(rootDir, '../fullstack-admin-serve/vue-element-admin-dev/src/views/AIEngine/workflow/index.vue'),
  'utf8',
)
const skillPackagePage = fs.readFileSync(
  path.join(rootDir, '../fullstack-admin-serve/vue-element-admin-dev/src/views/AIEngine/skillPackage/index.vue'),
  'utf8',
)

assert(schema.includes('promptId'), 'schema should store agent prompt binding as promptId')
assert(schema.includes('promptIds'), 'schema should store skill package prompt binding as promptIds')
assert(!schema.includes('promptCode       String'), 'AiAgent should not bind prompts by code')
assert(!schema.includes('promptCodes'), 'AiSkillPackage should not bind prompts by code')
assert(agentDto.includes('promptId: string'), 'agent dto should accept promptId')
assert(!agentDto.includes('promptCode: string'), 'agent dto should not accept promptCode')
assert(skillPackageDto.includes('promptIds?: string[]'), 'skill package dto should accept promptIds')
assert(promptService.includes('nextPromptCode'), 'prompt service should request database prompt codes')
assert(migrationSql.includes("'TSC' || lpad"), 'migration should generate TSC prompt codes')
assert(agentPage.includes('form.promptId') && !agentPage.includes('form.promptCode'), 'agent page should bind promptId')
assert(workflowPage.includes('nodeForm.promptId') && !workflowPage.includes('nodeForm.promptCode'), 'workflow page should bind promptId')
assert(skillPackagePage.includes('form.promptIds') && !skillPackagePage.includes('form.promptCodes'), 'skill package page should bind promptIds')

process.stdout.write('ok - ai prompt id contract\n')
