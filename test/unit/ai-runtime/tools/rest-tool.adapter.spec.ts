// 校验 REST Tool Adapter 将 HTTP 调用结果转换为统一 ToolResult。
import { RestToolAdapter } from 'src/ai-runtime/tools/adapters/rest-tool.adapter'
import { ToolDefinition } from 'src/ai-runtime/tools/tool.types'

const makeRestTool = (sourceConfig: unknown): ToolDefinition => ({
  code: 'rest_weather',
  name: 'REST 天气',
  description: 'REST 天气',
  source: 'rest',
  exposure: 'agent',
  enabled: true,
  inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
  sourceConfig,
})

describe('RestToolAdapter', () => {
  it('executes GET and POST requests without leaking runtime context', async () => {
    const calls: any[] = []
    const adapter = new RestToolAdapter({
      request: async (request) => {
        calls.push(request)
        return { status: 200, statusText: 'OK', data: { ok: true } }
      },
    })

    await expect(adapter.execute(makeRestTool({ method: 'GET', url: 'https://api.test/weather', query: { city: 'city' } }), { city: '上海' }, { userId: 'user-1' })).resolves.toEqual({ success: true, data: { ok: true } })
    await expect(adapter.execute(makeRestTool({ method: 'POST', url: 'https://api.test/weather', body: { city: 'city' } }), { city: '杭州' }, { userId: 'user-2' })).resolves.toEqual({ success: true, data: { ok: true } })

    expect(calls[0].params).toEqual({ city: '上海' })
    expect(calls[1].data).toEqual({ city: '杭州' })
    expect(JSON.stringify(calls)).not.toContain('user-1')
    expect(JSON.stringify(calls)).not.toContain('user-2')
  })

  it('converts http errors timeout network errors and invalid config to ToolResult failure', async () => {
    const httpErrorAdapter = new RestToolAdapter({ request: async () => ({ status: 404, statusText: 'Not Found', data: { message: 'missing' } }) })
    const timeoutAdapter = new RestToolAdapter({ request: async () => { const error: any = new Error('timeout'); error.code = 'ECONNABORTED'; throw error } })
    const networkAdapter = new RestToolAdapter({ request: async () => { throw new Error('network down') } })

    await expect(httpErrorAdapter.execute(makeRestTool({ method: 'GET', url: 'https://api.test/missing' }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'REST 工具请求失败：404 Not Found' } })
    await expect(timeoutAdapter.execute(makeRestTool({ method: 'GET', url: 'https://api.test/slow', timeoutMs: 1 }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'REST 工具请求超时' } })
    await expect(networkAdapter.execute(makeRestTool({ method: 'GET', url: 'https://api.test/down' }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'network down' } })
    await expect(networkAdapter.execute(makeRestTool({ method: 'GET' }), {}, { userId: 'user-1' })).resolves.toEqual({ success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: 'REST 工具配置缺少 url' } })
  })
})
