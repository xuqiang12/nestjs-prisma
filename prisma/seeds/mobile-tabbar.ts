// 这个文件负责维护小程序底部导航的默认可编辑配置。
import { Prisma } from '@prisma/client'
import { prisma } from '../client'

const mobileTabBarConfigSeed = {
  id: '340740439936077981',
  name: '主导航栏',
  status: 1,
  config: {
    id: 'default',
    name: '主导航栏',
    tabBarMode: 'native',
    bgColorMode: 'system',
    bgColor: '#ffffff',
    textColorMode: 'system',
    textColor: '#999999',
    activeColor: '#E83524',
    radiusMode: 'square',
    items: [
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
        id: 'category',
        name: '分类',
        icon: 'static/tabbar/category-normal.png',
        activeIcon: 'static/tabbar/category-active.png',
        linkType: 'page',
        pagePath: '/pages/category/index',
        sortNo: 1,
      },
      {
        id: 'tools',
        name: '工具',
        icon: 'static/tabbar/tools-normal.png',
        activeIcon: 'static/tabbar/tools-active.png',
        linkType: 'page',
        pagePath: '/pages/tools/index',
        sortNo: 2,
      },
      {
        id: 'ai-chat',
        name: 'AI 对话',
        icon: 'static/tabbar/ai-chat-normal.png',
        activeIcon: 'static/tabbar/ai-chat-active.png',
        linkType: 'page',
        pagePath: '/pages/aiChat/index',
        sortNo: 3,
      },
      {
        id: 'mine',
        name: '我的',
        icon: 'static/tabbar/profile-normal.png',
        activeIcon: 'static/tabbar/profile-active.png',
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
