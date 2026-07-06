import type { Type } from '@nestjs/common'
import { AuthModule } from '../../modules/auth/auth.module'
import { ChatModule } from '../../modules/chat/chat.module'
import { KnowledgeBotModule } from '../../modules/knowledge-bot/knowledge-bot.module'
import { MenuModule } from '../../modules/menu/menu.module'
import { UserModule } from '../../modules/user/user.module'

export interface Knife4jGroup {
  name: string
  url: string
  module: Type<any>
}

const enabledEnvironments = ['local', 'development', 'test']

export function isApiDocsEnabled(nodeEnv?: string) {
  return enabledEnvironments.includes(nodeEnv || 'development')
}

export function getKnife4jGroups(): Knife4jGroup[] {
  return [
    { name: '认证模块', url: '/api-docs/auth-json', module: AuthModule },
    { name: '用户模块', url: '/api-docs/user-json', module: UserModule },
    { name: '菜单模块', url: '/api-docs/menu-json', module: MenuModule },
    { name: '聊天模块', url: '/api-docs/chat-json', module: ChatModule },
    { name: '知识库模块', url: '/api-docs/knowledge-bot-json', module: KnowledgeBotModule },
  ]
}
