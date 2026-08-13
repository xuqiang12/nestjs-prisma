// 通过最小 MCP Client 抽象执行 mcp 来源工具并返回统一 ToolResult。
import { ToolSourceAdapter } from './tool-source-adapter.types'
import { ToolDefinition, ToolResult, ToolRuntimeContext } from '../tool.types'

export type McpClient = {
  callTool(server: string, toolName: string, args: Record<string, unknown>): Promise<unknown>
}

type McpToolConfig = {
  server?: string
  toolName?: string
}

export class McpToolAdapter implements ToolSourceAdapter {
  readonly source = 'mcp' as const

  // 注入最小 MCP Client，当前阶段不实现 MCP Server 管理。
  constructor(private readonly mcpClient: McpClient) {}

  // 判断当前适配器是否支持指定工具来源。
  supports(tool: ToolDefinition): boolean {
    return tool.source === this.source
  }

  // 调用 MCP 工具并转换响应或异常。
  async execute(tool: ToolDefinition, input: unknown, _context: ToolRuntimeContext): Promise<ToolResult> {
    const config = this.readConfig(tool)
    if (!config.server) {
      return this.failure('MCP 工具配置缺少 server')
    }
    if (!config.toolName) {
      return this.failure('MCP 工具配置缺少 toolName')
    }
    try {
      const data = await this.mcpClient.callTool(config.server, config.toolName, this.buildArguments(input))
      if (data === undefined || data === null) {
        return this.failure('MCP 工具返回为空')
      }
      return { success: true, data }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : String(error))
    }
  }

  // 读取 MCP 工具 sourceConfig。
  private readConfig(tool: ToolDefinition): McpToolConfig {
    return tool.sourceConfig && typeof tool.sourceConfig === 'object' && !Array.isArray(tool.sourceConfig)
      ? tool.sourceConfig as McpToolConfig
      : {}
  }

  // 将 Tool Input 转换为 MCP arguments。
  private buildArguments(input: unknown): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
      ? input as Record<string, unknown>
      : {}
  }

  // 构造 MCP 工具失败结果。
  private failure(message: string): ToolResult {
    return { success: false, error: { code: 'TOOL_EXECUTION_FAILED', message } }
  }
}
