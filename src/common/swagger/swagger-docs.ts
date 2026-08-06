// 配置 Knife4j 文档分组和启用环境。
import type { Type } from '@nestjs/common'
import { AuthModule } from '../../modules/auth/auth.module'
import { AgentChatModule } from '../../modules/agent-chat/agent-chat.module'
import { ChatModule } from '../../modules/chat/chat.module'
import { KnowledgeBotModule } from '../../modules/knowledge-bot/knowledge-bot.module'
import { MenuModule } from '../../modules/menu/menu.module'
import { RoleModule } from '../../modules/role/role.module'
import { UserModule } from '../../modules/user/user.module'
import { HomeModule } from '../../modules/home/home.module'
import { MobileTabBarModule } from '../../modules/mobile-tabbar/mobile-tabbar.module'
import { AiPlatformModule } from '../../modules/ai-platform/ai-platform.module'
import { AiConfigModule } from '../../modules/ai-config/ai-config.module'

export interface Knife4jGroup {
  name: string
  url: string
  modules: Type<any>[]
}

const enabledEnvironments = ['local', 'development', 'test']

// 判断当前环境是否允许暴露接口文档。
export function isApiDocsEnabled(nodeEnv?: string) {
  return enabledEnvironments.includes(nodeEnv || 'development')
}

// 生成 Knife4j 分组配置，确保 V2 对话入口进入 AI 分组。
export function getKnife4jGroups(): Knife4jGroup[] {
  return [
    { name: '授权模块', url: '/api-docs/authorization-json', modules: [AuthModule, UserModule, MenuModule, RoleModule, HomeModule, MobileTabBarModule] },
    { name: 'AI模块', url: '/api-docs/ai-json', modules: [ChatModule, AgentChatModule, KnowledgeBotModule, AiPlatformModule, AiConfigModule] },
  ]
}
