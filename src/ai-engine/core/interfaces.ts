// 记忆服务接口
export interface MemoryService {
  getShortMemory(userId: string): Promise<any>
  addMessage(userId: string, role: string, content: string): Promise<void>
  clearMemory(userId: string): Promise<void>
}

// 工具执行器接口
export interface ToolExecutor {
  execute(toolName: string, params: any): Promise<any>
  listTools(): ToolDefinition[]
  registerTool(name: string, definition: ToolDefinition): void
}

export interface ToolDefinition {
  name: string
  description: string
  params: Record<string, any>
  handler: (params: any) => Promise<any>
}

// 路由结果扩展
export interface ExtendedRouteResult {
  type: 'chat' | 'rag' | 'tool' | 'summary' | 'agent'
  workflow?: string
  confidence: number
  tools?: string[]
  reason?: string
}

// Agent 状态
export interface AgentState {
  message: string
  memory: any
  steps: Array<{ action: any; toolResult?: any }>
  result: any
}
