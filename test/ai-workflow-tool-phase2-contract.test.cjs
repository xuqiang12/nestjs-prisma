// 校验 Phase 2 后 Workflow 工具节点不再承担具体工具补参和 Agent 授权。
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

test('WorkflowExecutorService delegates tools through ToolExecutor without tool-specific branches', () => {
  const service = read('src/ai-runtime/workflow/workflow-executor.service.ts')

  assert.match(service, /this\.toolExecutor\.execute\(config\.toolCode,\s*toolInput,\s*this\.buildToolRuntimeContext\(input\)\)/)
  assert.match(service, /private buildToolInput\(params: any\)/)
  assert.match(service, /private buildToolRuntimeContext\(input: WorkflowExecutionInput\)/)
  assert.doesNotMatch(service, /toolCode\s*===/)
  assert.doesNotMatch(service, /switch\s*\(\s*toolCode\s*\)/)
  assert.doesNotMatch(service, /get_user_menu_permissions/)
  assert.doesNotMatch(service, /params\.userId/)
  assert.doesNotMatch(service, /return\s*{[^}]*\.\.\.[^}]*userId:\s*input\.userId[^}]*}/)
  assert.doesNotMatch(service, /BuiltinTool|SearchKnowledgeTool|GetUserMenuPermissionsTool/)
  assert.doesNotMatch(service, /\.handler\s*\(|handler:\s*/)
})

test('WorkflowExecutorService does not repeat Agent tool authorization', () => {
  const service = read('src/ai-runtime/workflow/workflow-executor.service.ts')

  assert.doesNotMatch(service, /ensureToolAllowed/)
  assert.doesNotMatch(service, /allowedToolCodes\.includes/)
  assert.doesNotMatch(service, /智能体未授权工具/)
})

test('WorkflowExecutorService consumes ToolResult without retry fallback or replan', () => {
  const service = read('src/ai-runtime/workflow/workflow-executor.service.ts')
  const unwrapToolResult = service.match(/private unwrapToolResult\(result: ToolResult\) \{[\s\S]*?\n  \}/)?.[0] || ''

  assert.match(service, /private unwrapToolResult\(result: ToolResult\)/)
  assert.match(service, /if \(!result\.success\)/)
  assert.match(service, /throw new BadRequestException\(failure\.error\.message\)/)
  assert.doesNotMatch(unwrapToolResult, /retry|fallback|replan|AgentLoop/i)
})
