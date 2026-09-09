// 校验业务详情页菜单数据由数据库 PAGE 路由维护。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')
const migrationPath = join(rootDir, 'prisma/migrations/20260909010000_add_business_detail_page_menus/migration.sql')

// 校验首页、底部导航和知识库详情页都进入菜单种子。
test('business detail pages are seeded as PAGE routes', () => {
  const menuSeed = readFileSync(join(rootDir, 'prisma/seeds/menu.ts'), 'utf8')

  const expectedPages = {
    '/mobile/homeConfig/detail': '/mobile',
    '/mobile/tabBar/detail': '/mobile',
    '/AIEngine/knowledge/document': '/AIEngine/base',
  }

  Object.entries(expectedPages).forEach(([routePath, parentPath]) => {
    const routePattern = routePath.replace(/\//g, '\\/')
    const parentPattern = parentPath.replace(/\//g, '\\/')
    assert.match(menuSeed, new RegExp(`path:\\s*'${routePattern}'[\\s\\S]*?type:\\s*MenuType\\.PAGE[\\s\\S]*?parentPath:\\s*'${parentPattern}'`))
  })
})

// 校验迁移会把现有数据库补齐到同一套 PAGE 路由来源。
test('business detail page migration inserts or updates PAGE routes', () => {
  assert.ok(existsSync(migrationPath), 'business detail page menu migration should exist')

  const migration = readFileSync(migrationPath, 'utf8')

  assert.match(migration, /\/mobile\/homeConfig\/detail/)
  assert.match(migration, /\/mobile\/tabBar\/detail/)
  assert.match(migration, /\/AIEngine\/knowledge\/document/)
  assert.match(migration, /'PAGE'::"MenuType"/)
})
