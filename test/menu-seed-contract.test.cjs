const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('menu seed exposes mobile tab bar page and grants default role menus', () => {
  const menuSeed = readFileSync(join(rootDir, 'prisma/seeds/menu.ts'), 'utf8')
  const mainSeed = readFileSync(join(rootDir, 'prisma/seed.ts'), 'utf8')

  assert.match(menuSeed, /name:\s*'移动端'/)
  assert.match(menuSeed, /path:\s*'\/mobile'/)
  assert.match(menuSeed, /component:\s*'Layout'/)
  assert.match(menuSeed, /name:\s*'底部导航配置'/)
  assert.match(menuSeed, /path:\s*'\/mobile\/tabBar'/)
  assert.match(menuSeed, /component:\s*'\/mobile\/tabBar\/index'/)
  assert.match(menuSeed, /prisma\.menuRole\.createMany/)
  assert.match(menuSeed, /skipDuplicates:\s*true/)
  assert.match(mainSeed, /seedMenus\(permissions,\s*role\.id\)/)
})
