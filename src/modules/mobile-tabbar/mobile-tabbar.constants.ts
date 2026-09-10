// 这个文件维护小程序底部导航的默认配置。
export const MOBILE_TABBAR_CONFIG_ID = 'default'

export const MOBILE_TABBAR_COLOR_MODES = ['system', 'custom'] as const

export const MOBILE_TABBAR_MODES = ['custom', 'native'] as const

export const MOBILE_TABBAR_RADIUS_MODES = ['square', 'round', 'largeRound'] as const

export const DEFAULT_MOBILE_TABBAR_CONFIG = {
  id: MOBILE_TABBAR_CONFIG_ID,
  name: '主导航栏',
  tabBarMode: 'custom',
  bgColorMode: 'system',
  bgColor: '#ffffff',
  textColorMode: 'system',
  textColor: '#999999',
  activeColor: '#E83524',
  radiusMode: 'square',
  items: [],
} as const
