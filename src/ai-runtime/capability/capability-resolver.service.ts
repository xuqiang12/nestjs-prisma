// 解析新版智能体当前请求可进入规划的能力边界。
import { Injectable } from '@nestjs/common'
import { AgentContext } from '../context/agent-context.types'
import { CapabilityStatus, ResolvedCapabilities } from './capability.types'

const KNOWLEDGE_TOOL_CODE = 'search_knowledge'

@Injectable()
export class CapabilityResolver {
  // 根据 AgentContext 生成 Planner 可见能力和诊断状态。
  resolve(context: AgentContext): ResolvedCapabilities {
    const diagnosticView = [
      this.resolveChat(context),
      this.resolveRag(context),
      this.resolveTool(context),
      this.resolveWorkflow(context),
    ]

    return {
      plannerView: diagnosticView.filter((item) => item.available).map((item) => item.capability),
      diagnosticView,
    }
  }

  // 判断当前上下文是否具备普通对话资格。
  private resolveChat(context: AgentContext): CapabilityStatus {
    if (context.model) {
      return { capability: 'chat', available: true }
    }
    return { capability: 'chat', available: false, reason: '未解析模型配置' }
  }

  // 判断当前上下文是否具备知识库检索规划资格。
  private resolveRag(context: AgentContext): CapabilityStatus {
    if (!context.capabilities.knowledgeEnabled) {
      return { capability: 'rag', available: false, reason: '未开启知识库能力' }
    }
    if (!context.capabilities.knowledgeBaseIds.length) {
      return { capability: 'rag', available: false, reason: '未绑定可用知识库' }
    }
    if (!context.capabilities.toolCodes.includes(KNOWLEDGE_TOOL_CODE)) {
      return { capability: 'rag', available: false, reason: '未授权知识检索工具' }
    }
    return { capability: 'rag', available: true }
  }

  // 判断当前上下文是否具备普通工具规划资格。
  private resolveTool(context: AgentContext): CapabilityStatus {
    const normalToolCodes = context.capabilities.toolCodes.filter((code) => code !== KNOWLEDGE_TOOL_CODE)
    if (normalToolCodes.length) {
      return { capability: 'tool', available: true }
    }
    return { capability: 'tool', available: false, reason: '未授权普通工具' }
  }

  // 判断当前上下文是否具备工作流规划资格。
  private resolveWorkflow(context: AgentContext): CapabilityStatus {
    if (context.capabilities.workflowCode?.trim()) {
      return { capability: 'workflow', available: true }
    }
    return { capability: 'workflow', available: false, reason: '未绑定工作流' }
  }
}
