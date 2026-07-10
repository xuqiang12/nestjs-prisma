import { Injectable } from '@nestjs/common'
import { ToolExecutor as IToolExecutor, ToolDefinition } from '../core/interfaces'
import { AIRegistry } from '../core/ai.registry'

@Injectable()
export class DefaultToolExecutor implements IToolExecutor {
  // 初始化工具执行器，并注册默认内置工具。
  constructor(private registry: AIRegistry) {
    this.registerDefaultTools()
  }

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

  // 注册基础演示工具，保证没有业务工具时工具执行器也有默认能力。
  private registerDefaultTools() {
    this.registry.registerTool({
      name: 'search_web',
      description: '搜索网络信息',
      params: { query: '搜索关键词' },
      handler: async (params: any) => {
        return { result: `搜索结果: ${params.query}` }
      },
    })

    this.registry.registerTool({
      name: 'get_time',
      description: '获取当前时间',
      params: {},
      handler: async () => {
        const time = new Date().toISOString()
        return { time }
      },
    })
  }
}

// 保留向后兼容的导出（不再推荐使用）
// 推荐通过 DI 注入 DefaultToolExecutor
export const toolExecutor = {
  execute: async (toolName: string, params: any) => {
    throw new Error(
      'Deprecated: Please inject DefaultToolExecutor instead of using the global instance',
    )
  },
  listTools: () => [],
  registerTool: () => {},
}
