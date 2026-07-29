const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const schema = fs.readFileSync(path.join(rootDir, 'prisma/schema.prisma'), 'utf8')
const aiPlatformModule = fs.readFileSync(path.join(rootDir, 'src/modules/ai-platform/ai-platform.module.ts'), 'utf8')
const agentDto = fs.readFileSync(path.join(rootDir, 'src/modules/ai-platform/agent/dto/agent.dto.ts'), 'utf8')
const promptService = fs.readFileSync(path.join(rootDir, 'src/modules/ai-platform/prompt/prompt.service.ts'), 'utf8')
const permissionSeed = fs.readFileSync(path.join(rootDir, 'prisma/seeds/permission.ts'), 'utf8')
const menuSeed = fs.readFileSync(path.join(rootDir, 'prisma/seeds/menu.ts'), 'utf8')
const migrationSql = fs.readFileSync(
  path.join(rootDir, 'prisma/migrations/20260729010000_use_snowflake_ids/migration.sql'),
  'utf8',
)
const removeSkillPackageMigrationSql = fs.readFileSync(
  path.join(rootDir, 'prisma/migrations/20260729020000_remove_ai_skill_package/migration.sql'),
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

assert(schema.includes('promptId'), 'schema should store agent prompt binding as promptId')
assert(!schema.includes('model AiSkillPackage'), 'removed skill package model should not remain')
assert(!schema.includes('promptCode       String'), 'AiAgent should not bind prompts by code')
assert(agentDto.includes('promptId: string'), 'agent dto should accept promptId')
assert(!agentDto.includes('promptCode: string'), 'agent dto should not accept promptCode')
assert(
  !fs.existsSync(path.join(rootDir, 'src/modules/ai-platform/skill-package')),
  'removed skill package module should not remain',
)
assert(!aiPlatformModule.includes('SkillPackage'), 'ai platform module should not register skill package providers')
assert(!permissionSeed.includes('ai:skill-package'), 'skill package permissions should not remain in seed')
assert(!menuSeed.includes('/AIEngine/skillPackage/index'), 'skill package menu should not remain in seed')
assert(
  removeSkillPackageMigrationSql.includes('/AIEngine/skillPackage/index'),
  'remove skill package migration should delete the stale skill package menu',
)
assert(
  removeSkillPackageMigrationSql.includes('ai:skill-package:%'),
  'remove skill package migration should delete stale skill package permissions',
)
assert(
  ['"MenuRole"', '"MenuButton"', '"Menu"', '"RolePermission"', '"Permission"'].every((table) =>
    removeSkillPackageMigrationSql.includes(table),
  ),
  'remove skill package migration should clean menu and permission relation tables',
)
assert(promptService.includes('nextPromptCode'), 'prompt service should request database prompt codes')
assert(migrationSql.includes("'TSC' || lpad"), 'migration should generate TSC prompt codes')
assert(agentPage.includes('form.promptId') && !agentPage.includes('form.promptCode'), 'agent page should bind promptId')
assert(workflowPage.includes('nodeForm.promptId') && !workflowPage.includes('nodeForm.promptCode'), 'workflow page should bind promptId')

process.stdout.write('ok - ai prompt id contract\n')
