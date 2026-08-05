// 注册新版智能体流式对话模块。
import { Module } from '@nestjs/common'
import { AgentContextBuilder } from '../../ai-runtime/context/agent-context.builder'
import { SseEventAdapter } from '../../ai-runtime/adapter/sse-event.adapter'
import { ConversationRepository } from './persistence/conversation.repository'
import { AgentStreamController } from './stream/agent-stream.controller'
import { AgentStreamService } from './stream/agent-stream.service'

@Module({
  controllers: [AgentStreamController],
  providers: [AgentStreamService, SseEventAdapter, AgentContextBuilder, ConversationRepository],
})
export class AgentChatModule {}
