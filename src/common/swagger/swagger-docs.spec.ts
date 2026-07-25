import '../utils/logger'
import { AuthModule } from '../../modules/auth/auth.module'
import { KnowledgeBotModule } from '../../modules/knowledge-bot/knowledge-bot.module'
import { MenuModule } from '../../modules/menu/menu.module'
import { RoleModule } from '../../modules/role/role.module'
import { UserModule } from '../../modules/user/user.module'
import { HomeModule } from '../../modules/home/home.module'
import { MobileTabBarModule } from '../../modules/mobile-tabbar/mobile-tabbar.module'
import { AiPlatformModule } from '../../modules/ai-platform/ai-platform.module'
import { getKnife4jGroups, isApiDocsEnabled } from './swagger-docs'

describe('swagger docs config', () => {
  it('enables api docs only for local, development, and test environments', () => {
    expect(isApiDocsEnabled(undefined)).toBe(true)
    expect(isApiDocsEnabled('')).toBe(true)
    expect(isApiDocsEnabled('local')).toBe(true)
    expect(isApiDocsEnabled('development')).toBe(true)
    expect(isApiDocsEnabled('test')).toBe(true)
    expect(isApiDocsEnabled('production')).toBe(false)
  })

  it('builds Knife4j groups by business domain', () => {
    const groups = getKnife4jGroups()

    expect(groups).toEqual([
      { name: '授权模块', url: '/api-docs/authorization-json', modules: [AuthModule, UserModule, MenuModule, RoleModule, HomeModule, MobileTabBarModule] },
      { name: 'AI模块', url: '/api-docs/ai-json', modules: [KnowledgeBotModule, AiPlatformModule] },
    ])
    expect(groups.some((group) => group.url === '/api-json')).toBe(false)
  })
})
