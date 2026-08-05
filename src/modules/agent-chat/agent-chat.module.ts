// 注册新版智能体流式对话模块。
import { Module } from '@nestjs/common'
import { CapabilityRegistry } from '../../ai-runtime/capability/capability-registry.service'
import { CapabilityResolver } from '../../ai-runtime/capability/capability-resolver.service'
import { AgentComposer } from '../../ai-runtime/composer/agent-composer.service'
import { AgentContextBuilder } from '../../ai-runtime/context/agent-context.builder'
import { AgentCapabilityExecutor } from '../../ai-runtime/executor/agent-capability-executor.service'
import { ChatHandler } from '../../ai-runtime/executor/handlers/chat.handler'
import { RagHandler } from '../../ai-runtime/executor/handlers/rag.handler'
import { ToolHandler } from '../../ai-runtime/executor/handlers/tool.handler'
import { WorkflowHandler } from '../../ai-runtime/executor/handlers/workflow.handler'
import { AgentPlanner } from '../../ai-runtime/planner/agent-planner.service'
import { AgentRuntimeService } from '../../ai-runtime/agent-runtime.service'
import { RulePlanner } from '../../ai-runtime/planner/rule-planner.service'
import { SseEventAdapter } from '../../ai-runtime/adapter/sse-event.adapter'
import { AgentTraceService } from '../../ai-runtime/trace/agent-trace.service'
import { AgentPlanValidator } from '../../ai-runtime/validator/agent-plan-validator.service'
import { AgentChatService } from './chat/agent-chat.service'
import { ConversationRepository } from './persistence/conversation.repository'
import { AgentStreamController } from './stream/agent-stream.controller'
import { AgentStreamService } from './stream/agent-stream.service'

@Module({
  controllers: [AgentStreamController],
  providers: [
    AgentStreamService,
    SseEventAdapter,
    AgentContextBuilder,
    ConversationRepository,
    CapabilityResolver,
    RulePlanner,
    AgentPlanner,
    AgentPlanValidator,
    AgentComposer,
    AgentTraceService,
    AgentRuntimeService,
    AgentChatService,
    ChatHandler,
    RagHandler,
    ToolHandler,
    WorkflowHandler,
    {
      provide: CapabilityRegistry,
      useFactory: (
        chatHandler: ChatHandler,
        ragHandler: RagHandler,
        toolHandler: ToolHandler,
        workflowHandler: WorkflowHandler,
      ) => new CapabilityRegistry([chatHandler, ragHandler, toolHandler, workflowHandler]),
      inject: [ChatHandler, RagHandler, ToolHandler, WorkflowHandler],
    },
    AgentCapabilityExecutor,
  ],
})
export class AgentChatModule {}
