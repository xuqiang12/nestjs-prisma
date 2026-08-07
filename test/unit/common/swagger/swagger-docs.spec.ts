// 验证 Swagger 文档开关和 Knife4j 分组配置。
import 'src/common/utils/logger'
import { AgentChatModule } from 'src/modules/agent-chat/agent-chat.module'
import { AuthModule } from 'src/modules/auth/auth.module'
import { ChatModule } from 'src/modules/chat/chat.module'
import { MenuModule } from 'src/modules/menu/menu.module'
import { RoleModule } from 'src/modules/role/role.module'
import { UserModule } from 'src/modules/user/user.module'
import { HomeModule } from 'src/modules/home/home.module'
import { MobileTabBarModule } from 'src/modules/mobile-tabbar/mobile-tabbar.module'
import { AiPlatformModule } from 'src/modules/ai-platform/ai-platform.module'
import { AiConfigModule } from 'src/modules/ai-config/ai-config.module'
import { getKnife4jGroups, isApiDocsEnabled } from 'src/common/swagger/swagger-docs'

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
      { name: 'AI模块', url: '/api-docs/ai-json', modules: [ChatModule, AgentChatModule, AiPlatformModule, AiConfigModule] },
    ])
    expect(groups.some((group) => group.url === '/api-json')).toBe(false)
  })
})
