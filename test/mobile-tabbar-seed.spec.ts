// 这个测试校验底部导航预置方案会写入可切换的完整配置集。
jest.mock('../prisma/client', () => ({
  prisma: {
    mobileTabBarConfig: {
      upsert: jest.fn(),
    },
  },
}))

import { prisma } from '../prisma/client'
import { seedMobileTabBarConfig } from '../prisma/seeds/mobile-tabbar'

const upsert = prisma.mobileTabBarConfig.upsert as jest.Mock

describe('mobile tabbar seed', () => {
  beforeEach(() => {
    upsert.mockReset()
    upsert.mockResolvedValue({})
  })

  // 验证 seed 写入本地、HTTPS、混合、AI 和原生五种可切换导航方案。
  it('writes five complete presets with one active local default', async () => {
    await seedMobileTabBarConfig()

    const configs = upsert.mock.calls.map(([params]) => params.create)
    const enabledConfigs = configs.filter((config) => config.status === 1)
    const remoteIcon = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/House/3D/house_3d.png'

    expect(configs).toHaveLength(5)
    expect(enabledConfigs).toHaveLength(1)
    expect(enabledConfigs[0]).toMatchObject({
      id: '340740439936077981',
      name: '本地默认导航',
      status: 1,
      config: {
        tabBarMode: 'custom',
        bgColorMode: 'custom',
        bgColor: '#FFFFFF',
        textColorMode: 'custom',
        textColor: '#8C8C8C',
        activeColor: '#E83524',
        radiusMode: 'square',
      },
    })
    expect(enabledConfigs[0].config.items).toHaveLength(5)
    expect(configs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: '340740439936077982',
        name: 'Fluent 远程导航',
        status: 0,
        config: expect.objectContaining({
          tabBarMode: 'custom',
          radiusMode: 'round',
          items: expect.arrayContaining([
            expect.objectContaining({ pagePath: '/pages/index/index', icon: remoteIcon, activeIcon: remoteIcon }),
            expect.objectContaining({ pagePath: '/pages/category/index' }),
            expect.objectContaining({ pagePath: '/pages/tools/index' }),
            expect.objectContaining({ pagePath: '/pages/aiChat/index' }),
            expect.objectContaining({ pagePath: '/pages/mine/index' }),
          ]),
        }),
      }),
      expect.objectContaining({
        id: '340740439936077983',
        name: '混合图标导航',
        status: 0,
        config: expect.objectContaining({
          radiusMode: 'largeRound',
          items: expect.arrayContaining([
            expect.objectContaining({
              icon: 'static/tabbar/category-normal.png',
              activeIcon: 'static/tabbar/category-active.png',
            }),
            expect.objectContaining({ icon: remoteIcon, activeIcon: remoteIcon }),
          ]),
        }),
      }),
      expect.objectContaining({
        id: '340740439936077984',
        name: 'AI 极简导航',
        status: 0,
        config: expect.objectContaining({
          bgColor: '#171A21',
          activeColor: '#55D6BE',
          radiusMode: 'largeRound',
          items: expect.arrayContaining([
            expect.objectContaining({ pagePath: '/pages/aiChat/index' }),
          ]),
        }),
      }),
      expect.objectContaining({
        id: '340740439936077985',
        name: '原生五项导航',
        status: 0,
        config: expect.objectContaining({
          tabBarMode: 'native',
          items: [],
        }),
      }),
    ]))
  })
})
