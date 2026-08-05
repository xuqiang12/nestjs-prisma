// 定义新版智能体运行时能力解析的类型模型。
import { AgentEvent } from '../events/agent-event.types'
import { AgentContext } from '../context/agent-context.types'
import { ExecutionStep } from '../planner/agent-planner.types'

export type CapabilityType = 'chat' | 'rag' | 'tool' | 'workflow'

export type CapabilityStatus = {
  capability: CapabilityType
  available: boolean
  reason?: string
}

export type ResolvedCapabilities = {
  plannerView: CapabilityType[]
  diagnosticView: CapabilityStatus[]
}

export type CapabilityHandler = {
  capability: CapabilityType
  execute(context: AgentContext, step: ExecutionStep): AsyncIterable<AgentEvent>
}
