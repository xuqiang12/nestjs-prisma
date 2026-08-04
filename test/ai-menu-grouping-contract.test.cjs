const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('AI center sidebar is grouped by application basic and advanced config', () => {
  const menuSeed = readFileSync(join(rootDir, 'prisma/seeds/menu.ts'), 'utf8')
  const migration = readFileSync(join(rootDir, 'prisma/migrations/20260804030000_group_ai_center_menus/migration.sql'), 'utf8')

  assert.match(menuSeed, /name:\s*'AI中心'[\s\S]*path:\s*'\/AIEngine'/)
  assert.match(menuSeed, /name:\s*'AI应用'[\s\S]*path:\s*'\/AIEngine\/application'[\s\S]*component:\s*'Layout'[\s\S]*parentPath:\s*'\/AIEngine'/)
  assert.match(menuSeed, /name:\s*'基础配置'[\s\S]*path:\s*'\/AIEngine\/base'[\s\S]*component:\s*'Layout'[\s\S]*parentPath:\s*'\/AIEngine'/)
  assert.match(menuSeed, /name:\s*'高级配置'[\s\S]*path:\s*'\/AIEngine\/advanced'[\s\S]*component:\s*'Layout'[\s\S]*parentPath:\s*'\/AIEngine'/)

  const expectedParents = {
    '/AIEngine/chat/index': '/AIEngine/application',
    '/AIEngine/agent/index': '/AIEngine/application',
    '/AIEngine/workflowRun/index': '/AIEngine/application',
    '/AIEngine/model/index': '/AIEngine/base',
    '/AIEngine/knowledge/index': '/AIEngine/base',
    '/AIEngine/prompt/index': '/AIEngine/base',
    '/AIEngine/sensitiveWord/index': '/AIEngine/base',
    '/AIEngine/skillPackage/index': '/AIEngine/advanced',
    '/AIEngine/tool/index': '/AIEngine/advanced',
    '/AIEngine/workflow/index': '/AIEngine/advanced',
  }

  Object.entries(expectedParents).forEach(([routePath, parentPath]) => {
    const routePattern = routePath.replace(/\//g, '\\/')
    const parentPattern = parentPath.replace(/\//g, '\\/')
    assert.match(menuSeed, new RegExp(`path:\\s*'${routePattern}'[\\s\\S]*?parentPath:\\s*'${parentPattern}'`))
  })

  assert.match(migration, /AI中心/)
  assert.match(migration, /AI应用/)
  assert.match(migration, /基础配置/)
  assert.match(migration, /高级配置/)
  assert.match(migration, /\/AIEngine\/application/)
  assert.match(migration, /\/AIEngine\/base/)
  assert.match(migration, /\/AIEngine\/advanced/)
})
