import { Workflow } from './types'
import { ToolDefinition } from './interfaces'

export class AIRegistry {
  private workflows: Map<string, Workflow> = new Map()
  private tools: Map<string, ToolDefinition> = new Map()

  // ========== 工作流注册 ==========
  // 注册一个工作流，后续可通过工作流名称查找执行。
  registerWorkflow(workflow: Workflow) {
    this.workflows.set(workflow.name, workflow)
    console.log('[AIRegistry] 工作流已注册:', workflow.name)
  }

  // 根据工作流名称读取已注册的工作流定义。
  getWorkflow(name: string): Workflow | undefined {
    return this.workflows.get(name)
  }

  // 列出当前注册中心内所有工作流名称。
  listWorkflows(): string[] {
    return Array.from(this.workflows.keys())
  }

  // ========== 工具注册 ==========
  // 注册一个 AI 工具，工具名称相同会被后注册的定义覆盖。
  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool)
    console.log('[AIRegistry] 工具已注册:', tool.name)
  }

  // 批量注册 AI 工具，复用单个工具注册逻辑。
  registerTools(tools: ToolDefinition[]) {
    tools.forEach(tool => this.registerTool(tool))
  }

  // 根据工具名称读取已注册的工具定义。
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  // 列出当前注册中心内所有工具定义。
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  // 列出当前注册中心内所有工具名称，便于日志和调试展示。
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }
}
