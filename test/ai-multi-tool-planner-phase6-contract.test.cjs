// 校验 Phase 6 多工具规划只扩展 Tool Plan，不引入循环、并发或第二套执行器。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

// 读取源码文件并确认文件存在。
function readSource(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  assert.equal(existsSync(absolutePath), true, `${relativePath} should exist`)
  return readFileSync(absolutePath, 'utf8')
}

test('Planner protocol supports toolCalls without creating a second plan system', () => {
  const plannerTypes = readSource('src/ai-runtime/planner/agent-planner.types.ts')
  const rulePlanner = readSource('src/ai-runtime/planner/rule-planner.service.ts')
  const intentClassifier = readSource('src/ai-runtime/planner/intent-classifier.service.ts')

  assert.match(plannerTypes, /export type ToolCallPlan = \{[\s\S]*toolCode: string[\s\S]*params: Record<string, unknown>/)
  assert.match(rulePlanner, /toolCalls/)
  assert.match(intentClassifier, /toolCalls/)
  assert.doesNotMatch([plannerTypes, rulePlanner, intentClassifier].join('\n'), /MultiToolPlan|PlannerSkillCatalog|SkillPlanner/)
})

test('Planner does not directly execute tools or source adapters', () => {
  const plannerFiles = [
    readSource('src/ai-runtime/planner/rule-planner.service.ts'),
    readSource('src/ai-runtime/planner/intent-classifier.service.ts'),
  ].join('\n')

  assert.doesNotMatch(plannerFiles, /DefaultToolExecutor|BuiltinTool|RestToolAdapter|McpToolAdapter/)
  assert.doesNotMatch(plannerFiles, /\bfetch\(|mcpClient|callTool/)
})

test('Validator checks every tool call through the existing tool boundary', () => {
  const validator = readSource('src/ai-runtime/validator/agent-plan-validator.service.ts')

  assert.match(validator, /normalizeToolCalls\(step\)/)
  assert.match(validator, /toolCalls\.forEach/)
  assert.match(validator, /this\.toolRegistry\.getTool\(toolCode\)/)
  assert.match(validator, /tool\.enabled/)
  assert.match(validator, /tool\.exposure !== 'agent'/)
})

test('ToolHandler executes toolCalls serially through existing ToolExecutor', () => {
  const toolHandler = readSource('src/ai-runtime/executor/handlers/tool.handler.ts')

  assert.match(toolHandler, /for \(const toolCall of this\.normalizeToolCalls\(step\)\)/)
  assert.match(toolHandler, /this\.toolExecutor\.execute\(toolCall\.toolCode,\s*toolCall\.params,/)
  assert.doesNotMatch(toolHandler, /Promise\.all|allSettled|ParallelTool|BatchTool|MultiToolExecutor|ToolOrchestrator/)
})

test('Phase 6 does not introduce agent loop retry fallback or replan', () => {
  const files = [
    'src/ai-runtime/planner/rule-planner.service.ts',
    'src/ai-runtime/planner/intent-classifier.service.ts',
    'src/ai-runtime/validator/agent-plan-validator.service.ts',
    'src/ai-runtime/executor/handlers/tool.handler.ts',
    'src/ai-runtime/executor/agent-capability-executor.service.ts',
  ].map(readSource).join('\n')

  assert.doesNotMatch(files, /AgentLoop|AutonomousAgent|maxIterations|Planner\s*->\s*Tool\s*->\s*Planner/)
  assert.doesNotMatch(files, /execute\([^)]*\)[\s\S]*plan\(/)
  assert.doesNotMatch(files, /retry|fallback|replan/i)
})

test('Skill Workflow and RAG stay outside multi tool planner changes', () => {
  const rulePlanner = readSource('src/ai-runtime/planner/rule-planner.service.ts')
  const intentClassifier = readSource('src/ai-runtime/planner/intent-classifier.service.ts')
  const runtime = readSource('src/ai-runtime/agent-runtime.service.ts')
  const combinedPlanner = [rulePlanner, intentClassifier].join('\n')

  assert.doesNotMatch(combinedPlanner, /SkillPackage|AiSkillPackage|skillCatalog|capability:\s*'skill'/)
  assert.doesNotMatch(runtime, /AiSkillPackage|aiSkillPackage/)
  assert.doesNotMatch(combinedPlanner, /WorkflowExecutorService|KnowledgeQAService/)
})
