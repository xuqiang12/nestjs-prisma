// 校验 Phase 4 工具来源 Adapter 接入后仍保持统一 Tool Contract。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

// 读取指定源码文件内容用于静态合同断言。
function readSource(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  assert.equal(existsSync(absolutePath), true, `${relativePath} should exist`)
  return readFileSync(absolutePath, 'utf8')
}

// 加载 Phase 4 工具来源相关运行时类用于接口模拟。
function loadTools() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return {
    ...require(join(rootDir, 'src/ai-runtime/tools/runtime-tool-registry.service')),
    ...require(join(rootDir, 'src/ai-runtime/tools/default-tool.executor')),
    ...require(join(rootDir, 'src/ai-runtime/tools/adapters/builtin-tool.adapter')),
    ...require(join(rootDir, 'src/ai-runtime/tools/adapters/rest-tool.adapter')),
    ...require(join(rootDir, 'src/ai-runtime/tools/adapters/mcp-tool.adapter')),
  }
}

// 构造测试用工具定义。
function makeTool(overrides) {
  return {
    code: 'tool',
    name: '测试工具',
    description: '测试工具',
    source: 'builtin',
    exposure: 'agent',
    enabled: true,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    ...overrides,
  }
}

test('ToolDefinition supports minimal sourceConfig and adapter contract stays source based', () => {
  const types = readSource('src/ai-runtime/tools/tool.types.ts')
  const adapterTypes = readSource('src/ai-runtime/tools/adapters/tool-source-adapter.types.ts')
  const definitionBlock = types.match(/export interface ToolDefinition \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(definitionBlock, /sourceConfig\?: unknown/)
  assert.match(adapterTypes, /export interface ToolSourceAdapter/)
  assert.match(adapterTypes, /readonly source: ToolSource/)
  assert.match(adapterTypes, /supports\(tool: ToolDefinition\): boolean/)
  assert.match(adapterTypes, /execute\(/)
  assert.match(adapterTypes, /Promise<ToolResult>/)
  assert.doesNotMatch(definitionBlock, /handler|execute|callback|function/)
})

test('DefaultToolExecutor delegates builtin rest and mcp sources to adapters', async () => {
  const { RuntimeToolRegistry, DefaultToolExecutor } = loadTools()
  const registry = new RuntimeToolRegistry()
  registry.registerTools([
    makeTool({ code: 'builtin_tool', source: 'builtin' }),
    makeTool({ code: 'rest_tool', source: 'rest' }),
    makeTool({ code: 'mcp_tool', source: 'mcp' }),
    makeTool({ code: 'disabled_tool', source: 'rest', enabled: false }),
    makeTool({ code: 'unknown_source', source: 'unknown' }),
  ])
  const calls = []
  const createAdapter = (source) => ({
    source,
    supports: (tool) => tool.source === source,
    execute: async (tool, input, context) => {
      calls.push({ source, code: tool.code, input, context })
      return { success: true, data: { source, input } }
    },
  })
  const executor = new DefaultToolExecutor(registry, [
    createAdapter('builtin'),
    createAdapter('rest'),
    createAdapter('mcp'),
  ])
  const context = { userId: 'user-1', agentCode: 'agent-1' }

  assert.deepEqual(await executor.execute('builtin_tool', { value: 1 }, context), {
    success: true,
    data: { source: 'builtin', input: { value: 1 } },
  })
  assert.deepEqual(await executor.execute('rest_tool', { value: 2 }, context), {
    success: true,
    data: { source: 'rest', input: { value: 2 } },
  })
  assert.deepEqual(await executor.execute('mcp_tool', { value: 3 }, context), {
    success: true,
    data: { source: 'mcp', input: { value: 3 } },
  })
  assert.deepEqual(await executor.execute('disabled_tool', {}, context), {
    success: false,
    error: { code: 'TOOL_DISABLED', message: '工具已禁用：disabled_tool' },
  })
  assert.deepEqual(await executor.execute('missing_tool', {}, context), {
    success: false,
    error: { code: 'TOOL_NOT_FOUND', message: '工具不存在：missing_tool' },
  })
  assert.deepEqual(await executor.execute('unknown_source', {}, context), {
    success: false,
    error: { code: 'TOOL_SOURCE_UNSUPPORTED', message: '当前阶段不支持执行 unknown 工具：unknown_source' },
  })
  assert.deepEqual(calls.map((item) => item.source), ['builtin', 'rest', 'mcp'])
})

test('REST and MCP adapters return unified ToolResult without leaking raw client responses', async () => {
  const { RestToolAdapter, McpToolAdapter } = loadTools()
  const restCalls = []
  const restAdapter = new RestToolAdapter({
    request: async (request) => {
      restCalls.push(request)
      return { status: 200, statusText: 'OK', headers: { server: 'mock' }, data: { ok: true } }
    },
  })
  const mcpCalls = []
  const mcpAdapter = new McpToolAdapter({
    callTool: async (server, toolName, args) => {
      mcpCalls.push({ server, toolName, args })
      return { content: [{ type: 'text', text: 'ok' }] }
    },
  })

  const restResult = await restAdapter.execute(makeTool({
    source: 'rest',
    sourceConfig: { method: 'POST', url: 'https://example.test/weather', body: { city: 'city' } },
  }), { city: '上海' }, { userId: 'user-1' })
  const mcpResult = await mcpAdapter.execute(makeTool({
    source: 'mcp',
    sourceConfig: { server: 'demo', toolName: 'weather' },
  }), { city: '上海' }, { userId: 'user-1' })

  assert.deepEqual(restResult, { success: true, data: { ok: true } })
  assert.deepEqual(mcpResult, { success: true, data: { content: [{ type: 'text', text: 'ok' }] } })
  assert.equal(restCalls[0].data.city, '上海')
  assert.equal(Object.prototype.hasOwnProperty.call(restCalls[0].data, 'userId'), false)
  assert.deepEqual(mcpCalls[0], { server: 'demo', toolName: 'weather', args: { city: '上海' } })
})

test('Planner Validator Workflow and management stay adapter agnostic', () => {
  const planner = readSource('src/ai-runtime/planner/rule-planner.service.ts')
  const classifier = readSource('src/ai-runtime/planner/intent-classifier.service.ts')
  const validator = readSource('src/ai-runtime/validator/agent-plan-validator.service.ts')
  const workflow = readSource('src/ai-runtime/workflow/workflow-executor.service.ts')
  const toolService = readSource('src/modules/ai-platform/tool/tool.service.ts')
  const executor = readSource('src/ai-runtime/tools/default-tool.executor.ts')
  const combinedPlanner = [planner, classifier, validator, workflow].join('\n')

  assert.doesNotMatch(combinedPlanner, /RestToolAdapter|McpToolAdapter|axios|httpClient|mcpClient|callTool/)
  assert.match(executor, /Map<ToolSource, ToolSourceAdapter>/)
  assert.doesNotMatch(executor, /axios|httpClient|mcpClient|callTool|method|url|headers|query|body/)
  assert.doesNotMatch(toolService, /adapter|httpClient|mcpClient|execute\(/)
})

test('No extra source factory resolver or retry architecture is introduced', () => {
  const source = [
    'src/ai-runtime/tools/default-tool.executor.ts',
    'src/ai-runtime/tools/adapters/builtin-tool.adapter.ts',
    'src/ai-runtime/tools/adapters/rest-tool.adapter.ts',
    'src/ai-runtime/tools/adapters/mcp-tool.adapter.ts',
  ].map(readSource).join('\n')

  assert.doesNotMatch(source, /ToolSourceResolver|ToolSourceFactory|ToolExecutionManager|ToolProviderRegistry|ToolRuntimeManager|ToolAdapterManager/)
  assert.doesNotMatch(source, /Retry|Fallback|Replan|AgentLoop|CircuitBreaker/i)
})
