import { Workflow } from './types'
import { ToolDefinition } from './interfaces'

export class AIRegistry {
  private workflows: Map<string, Workflow> = new Map()
  private tools: Map<string, ToolDefinition> = new Map()

  // ========== 工作流注册 ==========
  registerWorkflow(workflow: Workflow) {
    this.workflows.set(workflow.name, workflow)
    console.log('[AIRegistry] 工作流已注册:', workflow.name)
  }

  getWorkflow(name: string): Workflow | undefined {
    return this.workflows.get(name)
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys())
  }

  // ========== 工具注册 ==========
  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool)
    console.log('[AIRegistry] 工具已注册:', tool.name)
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
