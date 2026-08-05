// 定义新版智能体计划生成和校验使用的执行计划类型。
import { CapabilityType } from '../capability/capability.types'

export type PlanStrategy = {
  mode: 'sequential'
}

export type ExecutionStep = {
  id: string
  capability: CapabilityType
  reason?: string
  input: Record<string, any>
}

export type ExecutionPlan = {
  metadata: {
    version: number
  }
  strategy: PlanStrategy
  steps: ExecutionStep[]
}
