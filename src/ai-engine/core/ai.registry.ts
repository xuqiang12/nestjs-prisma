import { ToolDefinition } from '../tools/tool.types'

export class AIRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool)
  }

  registerTools(tools: ToolDefinition[]) {
    tools.forEach(tool => this.registerTool(tool))
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }
}
