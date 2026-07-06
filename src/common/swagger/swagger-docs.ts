import type { Type } from '@nestjs/common'
import { AuthModule } from '../../modules/auth/auth.module'
import { ChatModule } from '../../modules/chat/chat.module'
import { KnowledgeBotModule } from '../../modules/knowledge-bot/knowledge-bot.module'
import { MenuModule } from '../../modules/menu/menu.module'
import { UserModule } from '../../modules/user/user.module'

export interface Knife4jGroup {
  name: string
  url: string
  modules: Type<any>[]
}

const enabledEnvironments = ['local', 'development', 'test']

export function isApiDocsEnabled(nodeEnv?: string) {
  return enabledEnvironments.includes(nodeEnv || 'development')
}

export function getKnife4jGroups(): Knife4jGroup[] {
  return [
    { name: '授权模块', url: '/api-docs/authorization-json', modules: [AuthModule, UserModule, MenuModule] },
    { name: 'AI模块', url: '/api-docs/ai-json', modules: [ChatModule, KnowledgeBotModule] },
  ]
}
