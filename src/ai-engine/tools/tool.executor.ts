import { Injectable } from '@nestjs/common'
import { AIRegistry } from '../core/ai.registry'
import { ToolExecutor as IToolExecutor, ToolDefinition } from './tool.types'

@Injectable()
export class DefaultToolExecutor implements IToolExecutor {
  constructor(private registry: AIRegistry) {}

  // 兼容旧调用方的单个工具注册方式，实际仍统一写入 AIRegistry。
  // 兼容旧的注册方式
  registerTool(name: string, definition: ToolDefinition) {
    this.registry.registerTool(definition)
  }

  // 从注册中心读取当前所有可用工具定义。
  // 从 registry 获取工具
  listTools(): ToolDefinition[] {
    const tools = this.registry.listTools()
    return tools
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
