// 维护 AI 运行时可执行工具定义的注册表。
import { ToolDefinition } from './tool.types'

export class RuntimeToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  // 注册单个运行时工具定义。
  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool)
  }

  // 批量注册运行时工具定义。
  registerTools(tools: ToolDefinition[]) {
    tools.forEach(tool => this.registerTool(tool))
  }

  // 按工具编码获取运行时工具定义。
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  // 返回当前注册的全部运行时工具定义。
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  // 返回当前注册的全部工具编码。
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }
}
