// 这个测试校验底部导航图标来源的统一保存约束。
import { BadRequestException } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ConfigCenterService } from '../src/common/config-center/config-center.service'
import { MobileTabBarService } from '../src/modules/mobile-tabbar/mobile-tabbar.service'

const localItems = [
  {
    id: 'home',
    name: '首页',
    icon: 'static/tabbar/home-normal.png',
    activeIcon: 'static/tabbar/home-active.png',
    linkType: 'page',
    pagePath: '/pages/index/index',
    sortNo: 0,
  },
  {
    id: 'mine',
    name: '我的',
    icon: 'static/tabbar/profile-normal.png',
    activeIcon: 'static/tabbar/profile-active.png',
    linkType: 'page',
    pagePath: '/pages/mine/index',
    sortNo: 1,
  },
]

const pageOptions = [
  { label: '首页', value: '/pages/index/index' },
  { label: '分类', value: '/pages/category/index' },
  { label: 'AI 对话', value: '/pages/aiChat/index' },
  { label: '我的', value: '/pages/mine/index' },
]

type TabBarOptionsConfig = {
  iconOptions: Array<{ value: string; label: string; icon: string; activeIcon: string }>
  pageOptions: Array<{ label: string; value: string }>
}

// 创建只满足保存路径所需能力的 Prisma 替身。
const createService = (queryResult = [], localIconOptions = localItems) => {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue(queryResult),
    $executeRaw: jest.fn().mockResolvedValue(1),
  } as unknown as PrismaService
  const configCenterService = {
    readJsonConfig: jest.fn().mockReturnValue({ iconOptions: localIconOptions, pageOptions }),
  } as unknown as ConfigCenterService

  return new MobileTabBarService(prisma, configCenterService)
}

describe('ConfigCenterService tabbar options', () => {
  // 根目录配置文件同时提供后台可选图标和可跳转页面。
  it('reads tabbar options from the root nacos config directory', () => {
    const service = new ConfigCenterService()
    const key = { dataId: 'tabbar' }

    expect(() => service.readJsonConfig<TabBarOptionsConfig>(key)).not.toThrow()
    const config = service.readJsonConfig<TabBarOptionsConfig>(key)

    expect(config.iconOptions).toContainEqual({
      value: 'home',
      label: '首页图标',
      icon: 'static/tabbar/home-normal.png',
      activeIcon: 'static/tabbar/home-active.png',
    })
    expect(config.pageOptions).toContainEqual({ label: '首页', value: '/pages/index/index' })
  })
})

describe('MobileTabBarService icon source validation', () => {
  // 下拉框选项更新不应改变已经保存并启用的底部导航配置。
  it('returns the saved custom config after its icon leaves the dropdown options', async () => {
    const service = createService(
      [
        {
          id: 'published-tabbar',
          name: '已发布导航',
          status: 1,
          updatedAt: new Date(),
          config: {
            id: 'published-tabbar',
            name: '已发布导航',
            tabBarMode: 'custom',
            bgColorMode: 'system',
            bgColor: '#ffffff',
            textColorMode: 'system',
            textColor: '#999999',
            activeColor: '#E83524',
            radiusMode: 'square',
            items: localItems,
          },
        },
      ],
      [],
    )

    await expect(service.getConfig()).resolves.toMatchObject({
      id: 'published-tabbar',
      name: '已发布导航',
      tabBarMode: 'custom',
      items: localItems,
    })
  })

  // 运行时不会下发历史遗留的空图标自定义配置，避免客户端出现无效导航项。
  it('falls back to native tabbar when the published custom config has invalid icons', async () => {
    const service = createService([
      {
        id: 'invalid-published-tabbar',
        name: '无效自定义导航',
        status: 1,
        updatedAt: new Date(),
        config: {
          id: 'invalid-published-tabbar',
          name: '无效自定义导航',
          tabBarMode: 'custom',
          bgColorMode: 'system',
          bgColor: '#ffffff',
          textColorMode: 'system',
          textColor: '#999999',
          activeColor: '#E83524',
          radiusMode: 'square',
          items: [
            { ...localItems[0], icon: '', activeIcon: '' },
            localItems[1],
          ],
        },
      },
    ])

    await expect(service.getConfig()).resolves.toMatchObject({
      tabBarMode: 'native',
      items: [],
    })
  })

  // 原生导航使用小程序发版配置，保存时不接收运行时菜单图标。
  it('saves native tabbar configs without dynamic menu items', async () => {
    const service = createService()

    await expect(
      service.saveConfig({
        id: 'native-without-items',
        name: '原生导航',
        tabBarMode: 'native',
        items: [],
      }),
    ).resolves.toMatchObject({
      tabBarMode: 'native',
      items: [],
    })
  })

  // 自定义导航不能保存既非预置图标对也非 HTTPS 图标对的数据。
  it('rejects unsupported icon paths for custom tabbar configs', async () => {
    const service = createService()

    await expect(
      service.saveConfig({
        id: 'custom-with-unknown-icon',
        name: '自定义导航',
        tabBarMode: 'custom',
        items: [
          {
            ...localItems[0],
            icon: 'static/tabbar/missing-normal.png',
            activeIcon: 'static/tabbar/missing-active.png',
          },
          localItems[1],
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  // 自定义导航允许成对的 HTTPS 图标地址，供后台保存 CDN 图标。
  it('accepts HTTPS icon pairs for custom tabbar configs', async () => {
    const service = createService()

    const config = await service.saveConfig({
      id: 'custom-with-remote-icon',
      name: '自定义导航',
      tabBarMode: 'custom',
      items: [
        {
          ...localItems[0],
          icon: 'https://cdn.example.com/tabbar/home-normal.png',
          activeIcon: 'https://cdn.example.com/tabbar/home-active.png',
        },
        localItems[1],
      ],
    })

    expect(config.items[0]).toMatchObject({
      icon: 'https://cdn.example.com/tabbar/home-normal.png',
      activeIcon: 'https://cdn.example.com/tabbar/home-active.png',
    })
  })

  // 自定义导航拒绝 HTTP 地址，避免小程序正式环境无法加载图标。
  it('rejects HTTP icon pairs for custom tabbar configs', async () => {
    const service = createService()

    await expect(
      service.saveConfig({
        id: 'custom-with-http-icon',
        name: '自定义导航',
        tabBarMode: 'custom',
        items: [
          {
            ...localItems[0],
            icon: 'http://cdn.example.com/tabbar/home-normal.png',
            activeIcon: 'http://cdn.example.com/tabbar/home-active.png',
          },
          localItems[1],
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
