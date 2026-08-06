// 执行运行时工具注册表中已注册的工具。
import { Injectable } from '@nestjs/common'
import { RuntimeToolRegistry } from './runtime-tool-registry.service'
import { ToolExecutor as IToolExecutor, ToolDefinition } from './tool.types'

@Injectable()
export class DefaultToolExecutor implements IToolExecutor {
  // 注入运行时工具注册表，按工具编码查找真实处理器。
  constructor(private registry: RuntimeToolRegistry) {}

  // 兼容旧调用方的单个工具注册方式，实际仍统一写入运行时工具注册表。
  registerTool(name: string, definition: ToolDefinition) {
    void name
    this.registry.registerTool(definition)
  }

  // 从注册中心读取当前所有可用工具定义。
  listTools(): ToolDefinition[] {
    return this.registry.listTools()
  }

  // 按工具名称查找并执行对应 handler。
  async execute(toolName: string, params: any) {
    const tool = this.registry.getTool(toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`)
    }

    const result = await tool.handler(params)

    return result
  }
}
