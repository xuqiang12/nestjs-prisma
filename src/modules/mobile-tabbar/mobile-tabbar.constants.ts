export const MOBILE_TABBAR_CONFIG_ID = 'default'

export const MOBILE_TABBAR_COLOR_MODES = ['system', 'custom'] as const

export const MOBILE_TABBAR_RADIUS_MODES = ['square', 'round', 'largeRound'] as const

export const MOBILE_TABBAR_PAGE_OPTIONS = [
  { label: '首页', value: '/pages/index/index' },
  { label: '分类', value: '/pages/category/index' },
  { label: '购物车', value: '/pages/cart/index' },
  { label: '买家秀', value: '/pages/buyerShow/index' },
  { label: '我的', value: '/pages/mine/index' },
] as const

export const DEFAULT_MOBILE_TABBAR_CONFIG = {
  id: MOBILE_TABBAR_CONFIG_ID,
  name: '主导航栏',
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
} as const
