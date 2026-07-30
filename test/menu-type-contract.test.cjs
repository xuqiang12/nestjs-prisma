const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('menu type contract uses MENU for sidebar entries and PAGE for detail pages', () => {
  const schema = readFileSync(join(rootDir, 'prisma/schema.prisma'), 'utf8')
  const menuDto = readFileSync(join(rootDir, 'src/modules/menu/dto/menu.dto.ts'), 'utf8')
  const menuSeed = readFileSync(join(rootDir, 'prisma/seeds/menu.ts'), 'utf8')

  assert.match(schema, /enum MenuType \{[\s\S]*\bMENU\b[\s\S]*\bPAGE\b[\s\S]*\}/)
  assert.doesNotMatch(schema, /\bDIRECTORY\b/)
  assert.match(menuDto, /MENU = 'MENU'/)
  assert.match(menuDto, /PAGE = 'PAGE'/)
  assert.match(menuDto, /MENU=菜单 PAGE=详情页/)
  assert.doesNotMatch(menuDto, /\bDIRECTORY\b/)
  assert.match(menuSeed, /MENU = 'MENU'/)
  assert.doesNotMatch(menuSeed, /\bDIRECTORY\b/)

  ;[
    '/system',
    '/system/menu/index',
    '/system/user/index',
    '/system/role/index',
    '/AIEngine',
    '/AIEngine/chat/index',
    '/mobile',
    '/mobile/homeConfig/index',
    '/mobile/tabBar/index',
  ].forEach((routePath) => {
    const routePattern = routePath.replace(/\//g, '\\/')
    const pattern = new RegExp(`path:\\s*'${routePattern}'[\\s\\S]*?type:\\s*MenuType\\.MENU`)
    assert.match(menuSeed, pattern, `${routePath} should be seeded as a sidebar menu`)
  })
})
