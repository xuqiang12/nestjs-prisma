const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const adminRoot = path.resolve(rootDir, '../fullstack-admin-serve/vue-element-admin-dev')

const read = (file) => fs.readFileSync(path.join(rootDir, file), 'utf8')
const readAdmin = (file) => fs.readFileSync(path.join(adminRoot, file), 'utf8')

const schema = read('prisma/schema.prisma')
const aiPlatformModule = read('src/modules/ai-platform/ai-platform.module.ts')
const permissionSeed = read('prisma/seeds/permission.ts')
const menuSeed = read('prisma/seeds/menu.ts')
const api = readAdmin('src/api/ai.js')
const skillPackagePagePath = path.join(adminRoot, 'src/views/AIEngine/skillPackage/index.vue')

assert(schema.includes('model AiSkillPackage'), 'schema should keep AiSkillPackage model')
assert(schema.includes('promptIds'), 'skill package should bind prompts by promptIds')
assert(
  fs.existsSync(path.join(rootDir, 'src/modules/ai-platform/skill-package/skill-package.controller.ts')),
  'skill package controller should exist',
)
assert(
  aiPlatformModule.includes('SkillPackageController') && aiPlatformModule.includes('SkillPackageService'),
  'ai platform module should register skill package controller and service',
)
assert(permissionSeed.includes('ai:skill-package:list'), 'permission seed should include skill package permissions')
assert(menuSeed.includes('/AIEngine/skillPackage/index'), 'menu seed should include skill package page')
assert(api.includes('getSkillPackageList'), 'admin api should expose skill package requests')
assert(fs.existsSync(skillPackagePagePath), 'admin skill package page should exist')
assert(
  readAdmin('src/views/AIEngine/skillPackage/index.vue').includes('form.promptIds'),
  'admin skill package page should bind promptIds',
)

process.stdout.write('ok - ai skill package restore contract\n')
