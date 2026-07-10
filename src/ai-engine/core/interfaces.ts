// 记忆服务接口
export interface MemoryService {
  // 读取指定用户的短期记忆。
  getShortMemory(userId: string): Promise<any>
  // 追加一条指定用户的记忆消息。
  addMessage(userId: string, role: string, content: string): Promise<void>
  // 清空指定用户的短期记忆。
  clearMemory(userId: string): Promise<void>
}

// 工具执行器接口
export interface ToolExecutor {
  // 执行指定名称的工具。
  execute(toolName: string, params: any): Promise<any>
  // 列出当前可执行的工具定义。
  listTools(): ToolDefinition[]
  // 注册一个工具定义。
  registerTool(name: string, definition: ToolDefinition): void
}

export interface ToolDefinition {
  name: string
  description: string
  params: Record<string, any>
  // 工具被模型或编排器命中后实际执行的处理函数。
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
