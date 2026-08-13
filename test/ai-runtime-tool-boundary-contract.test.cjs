// 校验 AI Runtime Phase 1 工具契约、目录和执行边界。
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

// 加载工具运行时类用于接口模拟。
function loadTools() {
  require('ts-node/register')
  require('tsconfig-paths/register')
  return {
    ...require(join(rootDir, 'src/ai-runtime/tools/adapters/builtin-tool.adapter')),
    ...require(join(rootDir, 'src/ai-runtime/tools/runtime-tool-registry.service')),
    ...require(join(rootDir, 'src/ai-runtime/tools/default-tool.executor')),
  }
}

test('ToolDefinition is metadata only and runtime types stay minimal', () => {
  const types = readSource('src/ai-runtime/tools/tool.types.ts')
  const definitionBlock = types.match(/export interface ToolDefinition \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(types, /export type ToolSource = 'builtin' \| 'rest' \| 'mcp'/)
  assert.match(types, /export type ToolExposure = 'internal' \| 'agent'/)
  assert.match(types, /export interface JsonSchemaObject/)
  assert.match(types, /export interface ToolRuntimeContext/)
  assert.match(types, /export type ToolErrorCode =/)
  assert.match(types, /export type ToolResult<T = unknown> =/)
  assert.match(types, /export interface BuiltinTool/)
  assert.match(types, /export type BuiltinToolMap = ReadonlyMap<string, BuiltinTool>/)
  assert.match(definitionBlock, /code: string/)
  assert.match(definitionBlock, /source: ToolSource/)
  assert.match(definitionBlock, /exposure: ToolExposure/)
  assert.match(definitionBlock, /enabled: boolean/)
  assert.match(definitionBlock, /inputSchema: JsonSchemaObject/)
  assert.doesNotMatch(definitionBlock, /handler|execute|callback|function/)
})

test('RuntimeToolRegistry exposes catalog-only code APIs and filters planner-visible tools', () => {
  const { RuntimeToolRegistry } = loadTools()
  const registry = new RuntimeToolRegistry()
  registry.registerTools([
    {
      code: 'get_user_menu_permissions',
      name: '查询用户菜单权限',
      description: '查询当前用户拥有的菜单权限',
      source: 'builtin',
      exposure: 'agent',
      enabled: true,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      code: 'search_knowledge',
      name: '搜索知识库',
      description: '搜索知识库内容',
      source: 'builtin',
      exposure: 'internal',
      enabled: true,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      code: 'disabled_tool',
      name: '禁用工具',
      description: '禁用工具',
      source: 'builtin',
      exposure: 'agent',
      enabled: false,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ])

  assert.equal(registry.hasTool('get_user_menu_permissions'), true)
  assert.equal(registry.hasTool('missing_tool'), false)
  assert.equal(registry.getTool('get_user_menu_permissions').code, 'get_user_menu_permissions')
  assert.deepEqual(registry.listEnabledTools().map((tool) => tool.code), [
    'get_user_menu_permissions',
    'search_knowledge',
  ])
  assert.deepEqual(registry.listToolsByCodes([
    'get_user_menu_permissions',
    'search_knowledge',
    'disabled_tool',
    'missing_tool',
  ]).map((tool) => tool.code), ['get_user_menu_permissions'])

  const source = readSource('src/ai-runtime/tools/runtime-tool-registry.service.ts')
  assert.doesNotMatch(source, /\.handler\s*\(|handler\s*\(/)
  assert.doesNotMatch(source, /\.execute\s*\(|execute\s*\(/)
})

test('DefaultToolExecutor returns ToolResult without agent authorization or tool-specific branches', async () => {
  const { RuntimeToolRegistry, DefaultToolExecutor, BuiltinToolAdapter } = loadTools()
  const makeDefinition = (overrides) => ({
    code: 'ok_tool',
    name: '可用工具',
    description: '可用工具',
    source: 'builtin',
    exposure: 'agent',
    enabled: true,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    ...overrides,
  })
  const registry = new RuntimeToolRegistry()
  registry.registerTools([
    makeDefinition({ code: 'ok_tool' }),
    makeDefinition({ code: 'disabled_tool', enabled: false }),
    makeDefinition({ code: 'rest_tool', source: 'rest' }),
    makeDefinition({ code: 'missing_builtin' }),
    makeDefinition({ code: 'throw_tool' }),
  ])
  const builtinTools = new Map([
    ['ok_tool', { definition: makeDefinition({ code: 'ok_tool' }), execute: async () => ({ value: 1 }) }],
    ['throw_tool', { definition: makeDefinition({ code: 'throw_tool' }), execute: async () => { throw new Error('boom') } }],
  ])
  const executor = new DefaultToolExecutor(registry, [new BuiltinToolAdapter(builtinTools)])
  const context = { userId: 'user-1', agentCode: 'agent-1' }

  assert.deepEqual(await executor.execute('ok_tool', { q: 1 }, context), {
    success: true,
    data: { value: 1 },
  })
  assert.deepEqual(await executor.execute('missing_tool', {}, context), {
    success: false,
    error: { code: 'TOOL_NOT_FOUND', message: '工具不存在：missing_tool' },
  })
  assert.deepEqual(await executor.execute('disabled_tool', {}, context), {
    success: false,
    error: { code: 'TOOL_DISABLED', message: '工具已禁用：disabled_tool' },
  })
  assert.deepEqual(await executor.execute('rest_tool', {}, context), {
    success: false,
    error: { code: 'TOOL_SOURCE_UNSUPPORTED', message: '当前阶段不支持执行 rest 工具：rest_tool' },
  })
  assert.deepEqual(await executor.execute('missing_builtin', {}, context), {
    success: false,
    error: { code: 'TOOL_IMPLEMENTATION_NOT_FOUND', message: '内置工具实现不存在：missing_builtin' },
  })
  assert.deepEqual(await executor.execute('throw_tool', {}, context), {
    success: false,
    error: { code: 'TOOL_EXECUTION_FAILED', message: 'boom' },
  })

  const source = readSource('src/ai-runtime/tools/default-tool.executor.ts')
  assert.doesNotMatch(source, /toolCode\s*===/)
  assert.doesNotMatch(source, /switch\s*\(\s*toolCode\s*\)/)
  assert.doesNotMatch(source, /agent\.toolCodes|allowedToolCodes|Permission|Authorization/)
})
