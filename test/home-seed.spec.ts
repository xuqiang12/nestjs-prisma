// 这个文件校验首页装修种子数据可被单独恢复。
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('home decoration seed', () => {
  it('exports one complete homepage decoration through the standard seed entry', () => {
    const homeSeed = require('../prisma/seeds/home')
    const packageJsonPath = join(__dirname, '..', 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

    expect(existsSync(join(__dirname, '..', 'prisma', 'seeds', 'home.ts'))).toBe(true)
    expect(packageJson.scripts['seed:home']).toBeUndefined()
    expect(homeSeed.homeDecorationSeeds).toHaveLength(1)
    expect(homeSeed.homeDecorationSeeds[0].id).toBe('355640661845742159')
    expect(homeSeed.homeDecorationSeeds[0].name).toBe('首页配置')
    expect(homeSeed.homeDecorationSeeds[0].scene).toBe('homePage')
    expect(homeSeed.homeDecorationSeeds[0].components.map((item) => item.templateId)).toEqual([
      'homePageTitle',
      'navSingle',
      'advert',
      'notice',
      'cube',
      'typeList',
      'goodsWaterfall',
      'divider',
    ])
    const components = Object.fromEntries(
      homeSeed.homeDecorationSeeds[0].components.map((item) => [item.templateId, item.info]),
    )

    expect(components.homePageTitle.placeholder).toBe('搜索商品、品牌、活动')
    expect(components.homePageTitle.rollingWords).toEqual([
      '咖啡',
      '露营装备',
      '夏日防晒',
      '智能家居',
    ])
    expect(components.homePageTitle.isSearchSwiperWords).toBe(true)
    expect(components.advert.list).toHaveLength(2)
    expect(components.advert.list.every((item) => item.imgUrl)).toBe(true)
    expect(components.advert.bkChange).toBe(true)
    expect(components.notice.list).toHaveLength(2)
    expect(components.notice.iconBgColor).toBe('#f97316')
    expect(components.cube.list).toHaveLength(4)
    expect(components.cube.list.every((item) => item.imgUrl)).toBe(true)
    expect(components.typeList.list).toHaveLength(10)
    expect(components.typeList.list.every((item) => item.imgUrl)).toBe(true)
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('home-recommend')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('home-all-modules')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('home-new')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('home-life')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('home-digital')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('home-linkage')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('linkage-coffee')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('linkage-fruit')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('linkage-clean')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('linkage-storage')
    expect(JSON.stringify(homeSeed.homeDecorationSeeds)).not.toContain('home-empty')
  })
})
