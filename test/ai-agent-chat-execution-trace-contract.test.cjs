// 校验智能体流式对话统一执行轨迹合同。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

// 读取源码文件并确保目标文件存在。
function readSource(relativePath) {
  const absolutePath = join(rootDir, relativePath)
  assert.equal(existsSync(absolutePath), true, `${relativePath} should exist`)
  return readFileSync(absolutePath, 'utf8')
}

test('Agent events expose unified trace_update for frontend executionTrace', () => {
  const traceTypes = readSource('src/ai-runtime/trace/execution-trace.types.ts')
  const eventTypes = readSource('src/ai-runtime/events/agent-event.types.ts')

  assert.match(traceTypes, /export type ExecutionTrace =/)
  assert.match(traceTypes, /capability: ExecutionTraceCapability/)
  assert.match(traceTypes, /steps: ExecutionTraceStep\[\]/)
  assert.match(traceTypes, /detail\?: Record<string, any>/)
  assert.match(eventTypes, /type: 'trace_update'/)
})

test('ExecutionTracePresenter maps plan, sources, tool and workflow events into trace steps', () => {
  const presenter = readSource('src/ai-runtime/trace/execution-trace-presenter.service.ts')
  const streamService = readSource('src/modules/agent-chat/stream/agent-stream.service.ts')
  const moduleFile = readSource('src/modules/agent-chat/agent-chat.module.ts')
  const eventTypes = readSource('src/ai-runtime/events/agent-event.types.ts')

  assert.match(presenter, /class ExecutionTracePresenterService/)
  assert.match(presenter, /consume\(event: AgentEvent\)/)
  assert.match(presenter, /type: 'trace_update'/)
  assert.match(presenter, /知识库问答/)
  assert.match(presenter, /工具调用/)
  assert.match(presenter, /工作流执行/)
  assert.match(presenter, /isWorkflowEvent\(event\)/)
  assert.match(presenter, /previousSimple/)
  assert.match(presenter, /simple: \[\.\.\.previousSimple, \.\.\.simple\]/)
  assert.match(presenter, /event\.type === 'error'[\s\S]*this\.traces\.delete\(requestId\)/)
  assert.match(presenter, /event\.type === 'done'/)
  assert.match(presenter, /trace\.status = 'done'/)
  assert.match(presenter, /this\.traces\.delete\(requestId\)/)
  assert.match(eventTypes, /type: `workflow_\$\{string\}` \| `node_\$\{string\}`/)
  assert.match(streamService, /executionTracePresenter\.consume\(event\)/)
  assert.match(streamService, /const doneEvent: AgentEvent = \{[\s\S]*type: 'done'[\s\S]*executionTracePresenter\.consume\(doneEvent\)/)
  assert.match(moduleFile, /ExecutionTracePresenterService/)
})
