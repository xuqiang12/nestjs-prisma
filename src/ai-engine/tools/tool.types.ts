export interface ToolDefinition {
  name: string
  description: string
  params: Record<string, any>
  handler: (params: any) => Promise<any>
}

export interface ToolExecutor {
  execute(toolName: string, params: any): Promise<any>
  listTools(): ToolDefinition[]
  registerTool(name: string, definition: ToolDefinition): void
}
