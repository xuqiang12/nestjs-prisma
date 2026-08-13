// 校验 MCP Tool Adapter 将 MCP Client 响应转换为统一 ToolResult。
import { McpToolAdapter } from 'src/ai-runtime/tools/adapters/mcp-tool.adapter'
import { ToolDefinition } from 'src/ai-runtime/tools/tool.types'

const makeMcpTool = (sourceConfig: unknown): ToolDefinition => ({
  code: 'mcp_weather',
  name: 'MCP 天气',
  description: 'MCP 天气',
  source: 'mcp',
  exposure: 'agent',
  enabled: true,
  inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
  sourceConfig,
})

describe('McpToolAdapter', () => {
  it('calls configured server and tool with input arguments', async () => {
    const calls: any[] = []
    const adapter = new McpToolAdapter({
      callTool: async (server, toolName, args) => {
        calls.push({ server, toolName, args })
        return { content: [{ type: 'text', text: 'sunny' }] }
      },
    })

    await expect(adapter.execute(makeMcpTool({ server: 'weather-server', toolName: 'weather' }), { city: '上海' }, { userId: 'user-1' })).resolves.toEqual({ success: true, data: { content: [{ type: 'text', text: 'sunny' }] } })
    expect(calls).toEqual([{ server: 'weather-server', toolName: 'weather', args: { city: '上海' } }])
  })

  it('converts unavailable server missing tool execution failure and invalid response to ToolResult failure', async () => {
    const unavailable = new McpToolAdapter({ callTool: async () => { throw new Error('server unavailable') } })
    const invalid = new McpToolAdapter({ callTool: async () => undefined })

    await expect(unavailable.execute(makeMcpTool({ server: 'missing', toolName: 'weather' }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'server unavailable' } })
    await expect(invalid.execute(makeMcpTool({ server: 'weather-server', toolName: 'weather' }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'MCP 工具返回为空' } })
    await expect(invalid.execute(makeMcpTool({ toolName: 'weather' }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'MCP 工具配置缺少 server' } })
    await expect(invalid.execute(makeMcpTool({ server: 'weather-server' }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'MCP 工具配置缺少 toolName' } })
  })
})
