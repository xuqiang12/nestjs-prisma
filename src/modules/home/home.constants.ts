export const HOME_SCENES = ['homePage', 'firstScreen', 'content', 'empty'] as const

export const HOME_TEMPLATE_IDS = [
  'homePageTitle',
  'navSingle',
  'advert',
  'notice',
  'cube',
  'typeList',
  'goodsWaterfall',
  'divider',
  'search',
  'navLinkage',
] as const

export const HOME_CUBE_LAYOUTS = [
  'TWO_ROW',
  'THREE_ROW',
  'FOUR_ROW',
  'FOUR_GRID',
  'ONE_UP_TWO_DOWN',
  'ONE_LEFT_TWO_RIGHT',
  'ONE_LEFT_RIGHT_TOP_TWO_BOTTOM',
] as const

export const HOME_STATUS = {
  disabled: 0,
  enabled: 1,
} as const

export type HomeScene = (typeof HOME_SCENES)[number]
export type HomeTemplateId = (typeof HOME_TEMPLATE_IDS)[number]
export type HomeCubeLayout = (typeof HOME_CUBE_LAYOUTS)[number]
