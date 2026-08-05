// 定义新版智能体运行时的统一入口参数。
export type AgentRuntimeRequest = {
  message: {
    content: string
  }
  agent: {
    code: string
  }
  user: {
    id: string
    roles?: string[]
    permissions?: string[]
  }
  conversation: {
    id?: string
  }
  stream: {
    enabled: boolean
  }
  metadata: {
    requestId: string
    channel: string
    source: string
    createdAt: Date
  }
}
