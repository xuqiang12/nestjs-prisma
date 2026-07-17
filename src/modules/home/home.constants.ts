export const HOME_SCENES = ['homePage', 'firstScreen', 'content', 'empty'] as const

export const HOME_TEMPLATE_IDS = [
  'homePageTitle',
  'navSingle',
  'advert',
  'notice',
  'cube',
  'typeList',
  'divider',
  'search',
  'navLinkage',
] as const

export const HOME_STATUS = {
  disabled: 0,
  enabled: 1,
} as const

export type HomeScene = (typeof HOME_SCENES)[number]
export type HomeTemplateId = (typeof HOME_TEMPLATE_IDS)[number]
