// 这个文件负责维护小程序底部导航的默认可编辑配置。
import { Prisma } from '@prisma/client'
import { prisma } from '../client'

const mobileTabBarConfigSeed = {
  id: '340740439936077981',
  name: '主导航栏',
  status: 0,
  config: {
    id: 'default',
    name: '主导航栏',
    tabBarMode: 'native',
    bgColorMode: 'system',
    bgColor: '#ffffff',
    textColorMode: 'system',
    textColor: '#999999',
    activeColor: '#018d71',
    radiusMode: 'square',
    items: [
      {
        id: 'home',
        name: '首页',
        icon: 'static/tabbar/home.png',
        activeIcon: 'static/tabbar/homeHL.png',
        linkType: 'page',
        pagePath: '/pages/index/index',
        sortNo: 0,
      },
      {
        id: 'category',
        name: '分类',
        icon: '',
        activeIcon: '',
        linkType: 'page',
        pagePath: '/pages/category/index',
        sortNo: 1,
      },
      {
        id: 'cart',
        name: '购物车',
        icon: '',
        activeIcon: '',
        linkType: 'page',
        pagePath: '/pages/cart/index',
        sortNo: 2,
      },
      {
        id: 'buyer-show',
        name: '买家秀',
        icon: '',
        activeIcon: '',
        linkType: 'page',
        pagePath: '/pages/buyerShow/index',
        sortNo: 3,
      },
      {
        id: 'mine',
        name: '我的',
        icon: 'static/tabbar/example.png',
        activeIcon: 'static/tabbar/exampleHL.png',
        linkType: 'page',
        pagePath: '/pages/mine/index',
        sortNo: 4,
      },
    ],
  } as Prisma.InputJsonValue,
}

// 恢复后台可编辑的默认底部导航配置。
export async function seedMobileTabBarConfig() {
  console.log('初始化底部导航配置')

  await prisma.mobileTabBarConfig.upsert({
    where: { id: mobileTabBarConfigSeed.id },
    update: {
      name: mobileTabBarConfigSeed.name,
      config: mobileTabBarConfigSeed.config,
      status: mobileTabBarConfigSeed.status,
    },
    create: mobileTabBarConfigSeed,
  })
}
