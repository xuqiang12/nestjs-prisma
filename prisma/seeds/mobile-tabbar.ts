// 这个文件负责维护小程序底部导航的默认可编辑配置。
import { Prisma } from '@prisma/client'
import { prisma } from '../client'

// 这个常量维护 Fluent Emoji 官方 MIT 许可证的远程 PNG 图标地址。
const FLUENT_ICON_URLS = {
  home: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/House/3D/house_3d.png',
  category: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Card%20index%20dividers/3D/card_index_dividers_3d.png',
  tools: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hammer%20and%20wrench/3D/hammer_and_wrench_3d.png',
  aiChat: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Robot/3D/robot_3d.png',
  mine: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bust%20in%20silhouette/3D/bust_in_silhouette_3d.png',
}

const mobileTabBarConfigSeeds = [
  {
    id: '340740439936077981',
    name: '本地默认导航',
    status: 1,
    config: {
      id: '340740439936077981',
      name: '本地默认导航',
      tabBarMode: 'custom',
      bgColorMode: 'custom',
      bgColor: '#FFFFFF',
      textColorMode: 'custom',
      textColor: '#8C8C8C',
      activeColor: '#E83524',
      radiusMode: 'square',
      items: [
        { id: 'home', name: '首页', icon: 'static/tabbar/home-normal.png', activeIcon: 'static/tabbar/home-active.png', linkType: 'page', pagePath: '/pages/index/index', sortNo: 0 },
        { id: 'category', name: '分类', icon: 'static/tabbar/category-normal.png', activeIcon: 'static/tabbar/category-active.png', linkType: 'page', pagePath: '/pages/category/index', sortNo: 1 },
        { id: 'tools', name: '工具', icon: 'static/tabbar/tools-normal.png', activeIcon: 'static/tabbar/tools-active.png', linkType: 'page', pagePath: '/pages/tools/index', sortNo: 2 },
        { id: 'ai-chat', name: 'AI 对话', icon: 'static/tabbar/ai-chat-normal.png', activeIcon: 'static/tabbar/ai-chat-active.png', linkType: 'page', pagePath: '/pages/aiChat/index', sortNo: 3 },
        { id: 'mine', name: '我的', icon: 'static/tabbar/profile-normal.png', activeIcon: 'static/tabbar/profile-active.png', linkType: 'page', pagePath: '/pages/mine/index', sortNo: 4 },
      ],
    } as Prisma.InputJsonValue,
  },
  {
    id: '340740439936077982',
    name: 'Fluent 远程导航',
    status: 0,
    config: {
      id: '340740439936077982',
      name: 'Fluent 远程导航',
      tabBarMode: 'custom',
      bgColorMode: 'custom',
      bgColor: '#F6F8FC',
      textColorMode: 'custom',
      textColor: '#667085',
      activeColor: '#2563EB',
      radiusMode: 'round',
      items: [
        { id: 'home', name: '首页', icon: FLUENT_ICON_URLS.home, activeIcon: FLUENT_ICON_URLS.home, linkType: 'page', pagePath: '/pages/index/index', sortNo: 0 },
        { id: 'category', name: '分类', icon: FLUENT_ICON_URLS.category, activeIcon: FLUENT_ICON_URLS.category, linkType: 'page', pagePath: '/pages/category/index', sortNo: 1 },
        { id: 'tools', name: '工具', icon: FLUENT_ICON_URLS.tools, activeIcon: FLUENT_ICON_URLS.tools, linkType: 'page', pagePath: '/pages/tools/index', sortNo: 2 },
        { id: 'ai-chat', name: 'AI 对话', icon: FLUENT_ICON_URLS.aiChat, activeIcon: FLUENT_ICON_URLS.aiChat, linkType: 'page', pagePath: '/pages/aiChat/index', sortNo: 3 },
        { id: 'mine', name: '我的', icon: FLUENT_ICON_URLS.mine, activeIcon: FLUENT_ICON_URLS.mine, linkType: 'page', pagePath: '/pages/mine/index', sortNo: 4 },
      ],
    } as Prisma.InputJsonValue,
  },
  {
    id: '340740439936077983',
    name: '混合图标导航',
    status: 0,
    config: {
      id: '340740439936077983',
      name: '混合图标导航',
      tabBarMode: 'custom',
      bgColorMode: 'custom',
      bgColor: '#F7F8FC',
      textColorMode: 'custom',
      textColor: '#7A8494',
      activeColor: '#635BFF',
      radiusMode: 'largeRound',
      items: [
        { id: 'home', name: '首页', icon: FLUENT_ICON_URLS.home, activeIcon: FLUENT_ICON_URLS.home, linkType: 'page', pagePath: '/pages/index/index', sortNo: 0 },
        { id: 'category', name: '分类', icon: 'static/tabbar/category-normal.png', activeIcon: 'static/tabbar/category-active.png', linkType: 'page', pagePath: '/pages/category/index', sortNo: 1 },
        { id: 'tools', name: '工具', icon: FLUENT_ICON_URLS.tools, activeIcon: FLUENT_ICON_URLS.tools, linkType: 'page', pagePath: '/pages/tools/index', sortNo: 2 },
        { id: 'ai-chat', name: 'AI 对话', icon: 'static/tabbar/ai-chat-normal.png', activeIcon: 'static/tabbar/ai-chat-active.png', linkType: 'page', pagePath: '/pages/aiChat/index', sortNo: 3 },
        { id: 'mine', name: '我的', icon: FLUENT_ICON_URLS.mine, activeIcon: FLUENT_ICON_URLS.mine, linkType: 'page', pagePath: '/pages/mine/index', sortNo: 4 },
      ],
    } as Prisma.InputJsonValue,
  },
  {
    id: '340740439936077984',
    name: 'AI 极简导航',
    status: 0,
    config: {
      id: '340740439936077984',
      name: 'AI 极简导航',
      tabBarMode: 'custom',
      bgColorMode: 'custom',
      bgColor: '#171A21',
      textColorMode: 'custom',
      textColor: '#A8B0BE',
      activeColor: '#55D6BE',
      radiusMode: 'largeRound',
      items: [
        { id: 'home', name: '首页', icon: 'static/tabbar/home-normal.png', activeIcon: 'static/tabbar/home-active.png', linkType: 'page', pagePath: '/pages/index/index', sortNo: 0 },
        { id: 'ai-chat', name: 'AI 对话', icon: FLUENT_ICON_URLS.aiChat, activeIcon: FLUENT_ICON_URLS.aiChat, linkType: 'page', pagePath: '/pages/aiChat/index', sortNo: 1 },
        { id: 'mine', name: '我的', icon: 'static/tabbar/profile-normal.png', activeIcon: 'static/tabbar/profile-active.png', linkType: 'page', pagePath: '/pages/mine/index', sortNo: 2 },
      ],
    } as Prisma.InputJsonValue,
  },
  {
    id: '340740439936077985',
    name: '原生五项导航',
    status: 0,
    config: {
      id: '340740439936077985',
      name: '原生五项导航',
      tabBarMode: 'native',
      bgColorMode: 'system',
      bgColor: '#FFFFFF',
      textColorMode: 'system',
      textColor: '#999999',
      activeColor: '#E83524',
      radiusMode: 'square',
      items: [],
    } as Prisma.InputJsonValue,
  },
]

// 恢复后台可切换的底部导航预置方案。
export async function seedMobileTabBarConfig() {
  console.log('初始化底部导航配置')

  for (const configSeed of mobileTabBarConfigSeeds) {
    await prisma.mobileTabBarConfig.upsert({
      where: { id: configSeed.id },
      update: {
        name: configSeed.name,
        config: configSeed.config,
        status: configSeed.status,
      },
      create: configSeed,
    })
  }
}
