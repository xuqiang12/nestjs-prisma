// 维护 AI 运行时可执行工具定义的注册表。
import { ToolDefinition } from './tool.types'

export class RuntimeToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  // 注册单个运行时工具定义。
  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.code, tool)
  }

  // 批量注册运行时工具定义。
  registerTools(tools: ToolDefinition[]) {
    tools.forEach(tool => this.registerTool(tool))
  }

  // 按工具编码获取运行时工具定义。
  getTool(code: string): ToolDefinition | undefined {
    return this.tools.get(code)
  }

  // 判断指定工具编码是否已经注册。
  hasTool(code: string): boolean {
    return this.tools.has(code)
  }

  // 返回当前注册的全部运行时工具定义。
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  // 返回当前注册且系统启用的工具定义。
  listEnabledTools(): ToolDefinition[] {
    return this.listTools().filter((tool) => tool.enabled)
  }

  // 按调用方提供的编码列表返回可配置给 Agent 的启用工具定义。
  listToolsByCodes(toolCodes: string[]): ToolDefinition[] {
    return toolCodes
      .map((code) => this.getTool(code))
      .filter((tool): tool is ToolDefinition => !!tool && tool.enabled && tool.exposure === 'agent')
  }

  // 返回当前注册的全部工具编码。
  getToolCodes(): string[] {
    return Array.from(this.tools.keys())
  }

  // 返回当前注册的全部工具编码，兼容旧调用点命名。
  getToolNames(): string[] {
    return this.getToolCodes()
  }
}
