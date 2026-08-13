// 校验默认工具执行器按工具来源分发到最小 Source Adapter。
import { DefaultToolExecutor } from 'src/ai-runtime/tools/default-tool.executor'
import { RuntimeToolRegistry } from 'src/ai-runtime/tools/runtime-tool-registry.service'
import { ToolDefinition, ToolSourceAdapter } from 'src/ai-runtime/tools/tool.types'

const makeTool = (overrides: Partial<ToolDefinition>): ToolDefinition => ({
  code: 'tool',
  name: '测试工具',
  description: '测试工具',
  source: 'builtin',
  exposure: 'agent',
  enabled: true,
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  ...overrides,
})

describe('DefaultToolExecutor', () => {
  // 构造包含 builtin/rest/mcp 的执行器和调用记录。
  function createExecutor() {
    const registry = new RuntimeToolRegistry()
    registry.registerTools([
      makeTool({ code: 'builtin_tool', source: 'builtin' }),
      makeTool({ code: 'rest_tool', source: 'rest' }),
      makeTool({ code: 'mcp_tool', source: 'mcp' }),
      makeTool({ code: 'disabled_tool', source: 'rest', enabled: false }),
      makeTool({ code: 'unknown_source', source: 'unknown' as any }),
    ])
    const calls: string[] = []
    const adapters: ToolSourceAdapter[] = ['builtin', 'rest', 'mcp'].map((source) => ({
      source: source as any,
      supports: (tool) => tool.source === source,
      execute: async (tool) => {
        calls.push(`${source}:${tool.code}`)
        return { success: true, data: { source, code: tool.code } }
      },
    }))
    return { executor: new DefaultToolExecutor(registry, adapters), calls }
  }

  it('delegates supported sources and keeps disabled or unknown failures in executor', async () => {
    const { executor, calls } = createExecutor()
    const context = { userId: 'user-1' }

    await expect(executor.execute('builtin_tool', {}, context)).resolves.toEqual({ success: true, data: { source: 'builtin', code: 'builtin_tool' } })
    await expect(executor.execute('rest_tool', {}, context)).resolves.toEqual({ success: true, data: { source: 'rest', code: 'rest_tool' } })
    await expect(executor.execute('mcp_tool', {}, context)).resolves.toEqual({ success: true, data: { source: 'mcp', code: 'mcp_tool' } })
    await expect(executor.execute('disabled_tool', {}, context)).resolves.toEqual({ success: false, error: { code: 'TOOL_DISABLED', message: '工具已禁用：disabled_tool' } })
    await expect(executor.execute('missing_tool', {}, context)).resolves.toEqual({ success: false, error: { code: 'TOOL_NOT_FOUND', message: '工具不存在：missing_tool' } })
    await expect(executor.execute('unknown_source', {}, context)).resolves.toEqual({ success: false, error: { code: 'TOOL_SOURCE_UNSUPPORTED', message: '当前阶段不支持执行 unknown 工具：unknown_source' } })
    expect(calls).toEqual(['builtin:builtin_tool', 'rest:rest_tool', 'mcp:mcp_tool'])
  })
})
