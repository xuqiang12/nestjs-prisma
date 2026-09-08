// 这个文件校验首页装修种子数据可被单独恢复。
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('home decoration seed', () => {
  it('exports the historical home template data through the standard seed entry', () => {
    const homeSeed = require('../prisma/seeds/home')
    const packageJsonPath = join(__dirname, '..', 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

    expect(existsSync(join(__dirname, '..', 'prisma', 'seeds', 'home.ts'))).toBe(true)
    expect(packageJson.scripts['seed:home']).toBeUndefined()
    expect(homeSeed.homeDecorationSeeds.map((item) => item.id)).toEqual([
      'mock-home',
      'home-all-modules',
      'home-recommend',
      'home-new',
      'home-life',
      'home-digital',
      'home-linkage',
      'linkage-coffee',
      'linkage-fruit',
      'linkage-clean',
      'linkage-storage',
      'home-empty',
    ])
    expect(homeSeed.homeDecorationSeeds.reduce((total, item) => total + item.components.length, 0)).toBe(39)
    expect(homeSeed.homeDecorationSeeds[0].components.map((item) => item.templateId)).toEqual([
      'homePageTitle',
      'navSingle',
    ])
  })
})
