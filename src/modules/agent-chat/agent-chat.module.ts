// 注册新版智能体流式对话模块。
import { Module } from '@nestjs/common'
import { SseEventAdapter } from '../../ai-engine/agent-v2/adapter/sse-event.adapter'
import { AgentStreamController } from './stream/agent-stream.controller'
import { AgentStreamService } from './stream/agent-stream.service'

@Module({
  controllers: [AgentStreamController],
  providers: [AgentStreamService, SseEventAdapter],
})
export class AgentChatModule {}
