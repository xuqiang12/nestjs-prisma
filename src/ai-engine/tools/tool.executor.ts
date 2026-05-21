import { Injectable } from '@nestjs/common'
import { ToolExecutor as IToolExecutor, ToolDefinition } from '../core/interfaces'

@Injectable()
export class DefaultToolExecutor implements IToolExecutor {
  private tools: Map<string, ToolDefinition> = new Map()

  constructor() {
    console.log('[ToolExecutor（tool）] 构造函数-开始初始化...')
    this.registerDefaultTools()
    console.log('[ToolExecutor（tool）] 构造函数-初始化完成✅，已注册工具数量:', this.tools.size)
  }

  registerTool(name: string, definition: ToolDefinition) {
    console.log('[ToolExecutor（registerTool）] 注册工具:', name)
    this.tools.set(name, definition)
    console.log('[ToolExecutor（registerTool）] 工具', name, '注册完成✅')
  }

  listTools(): ToolDefinition[] {
    console.log('[ToolExecutor（listTools）] 列出所有工具...')
    const tools = Array.from(this.tools.values())
    console.log('[ToolExecutor（listTools）] 可用工具:', tools.map(t => t.name))
    return tools
  }

  async execute(toolName: string, params: any) {
    console.log('[ToolExecutor（execute）] 执行工具:', { toolName, params })

    const tool = this.tools.get(toolName)
    if (!tool) {
      console.log('[ToolExecutor（execute）] ❌ 工具不存在:', toolName)
      throw new Error(`Tool ${toolName} not found`)
    }

    console.log('[ToolExecutor（execute）] 找到工具，开始执行 handler...')
    const result = await tool.handler(params)
    console.log('[ToolExecutor（execute）] 工具执行完成，结果:', result)

    return result
  }

  private registerDefaultTools() {
    console.log('[ToolExecutor（registerDefaultTools）] 注册默认工具...')

    this.registerTool('search_web', {
      name: 'search_web',
      description: '搜索网络信息',
      params: { query: '搜索关键词' },
      handler: async (params: any) => {
        console.log('[ToolExecutor（search_web）] 执行搜索，查询:', params.query)
        return { result: `搜索结果: ${params.query}` }
      },
    })

    this.registerTool('get_time', {
      name: 'get_time',
      description: '获取当前时间',
      params: {},
      handler: async () => {
        const time = new Date().toISOString()
        console.log('[ToolExecutor（get_time）] 获取时间:', time)
        return { time }
      },
    })

    console.log('[ToolExecutor（registerDefaultTools）] 默认工具注册完成')
  }
}

export const toolExecutor = new DefaultToolExecutor()
