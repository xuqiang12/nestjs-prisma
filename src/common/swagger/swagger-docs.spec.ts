import '../utils/logger'
import { AuthModule } from '../../modules/auth/auth.module'
import { ChatModule } from '../../modules/chat/chat.module'
import { KnowledgeBotModule } from '../../modules/knowledge-bot/knowledge-bot.module'
import { MenuModule } from '../../modules/menu/menu.module'
import { UserModule } from '../../modules/user/user.module'
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

  it('builds one Knife4j group per public module document', () => {
    const groups = getKnife4jGroups()

    expect(groups).toEqual([
      { name: '认证模块', url: '/api-docs/auth-json', module: AuthModule },
      { name: '用户模块', url: '/api-docs/user-json', module: UserModule },
      { name: '菜单模块', url: '/api-docs/menu-json', module: MenuModule },
      { name: '聊天模块', url: '/api-docs/chat-json', module: ChatModule },
      { name: '知识库模块', url: '/api-docs/knowledge-bot-json', module: KnowledgeBotModule },
    ])
    expect(groups.some((group) => group.url === '/api-json')).toBe(false)
  })
})
