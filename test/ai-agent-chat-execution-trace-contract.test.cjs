// 校验智能体流式对话统一执行轨迹和历史持久化合同。
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

test('ExecutionTracePresenter reuses builder for plan, sources, tool and workflow trace steps', () => {
  const presenter = readSource('src/ai-runtime/trace/execution-trace-presenter.service.ts')
  const builder = readSource('src/ai-runtime/trace/execution-trace-builder.service.ts')
  const streamService = readSource('src/modules/agent-chat/stream/agent-stream.service.ts')
  const moduleFile = readSource('src/modules/agent-chat/agent-chat.module.ts')
  const eventTypes = readSource('src/ai-runtime/events/agent-event.types.ts')

  assert.match(presenter, /class ExecutionTracePresenterService/)
  assert.match(presenter, /consume\(event: AgentEvent\)/)
  assert.match(presenter, /type: 'trace_update'/)
  assert.match(presenter, /executionTraceBuilder\.applyEvent\(trace, event\)/)
  assert.match(builder, /知识库问答/)
  assert.match(builder, /工具调用/)
  assert.match(builder, /工作流执行/)
  assert.match(builder, /isWorkflowEvent\(event\)/)
  assert.match(builder, /previousSimple/)
  assert.match(builder, /simple: \[\.\.\.previousSimple, \.\.\.simple\]/)
  assert.match(presenter, /event\.type === 'error'[\s\S]*this\.traces\.delete\(requestId\)/)
  assert.match(builder, /event\.type === 'done'/)
  assert.match(builder, /trace\.status = 'done'/)
  assert.match(presenter, /this\.traces\.delete\(requestId\)/)
  assert.match(eventTypes, /type: `workflow_\$\{string\}` \| `node_\$\{string\}`/)
  assert.match(streamService, /executionTracePresenter\.consume\(event\)/)
  assert.match(streamService, /const doneEvent: AgentEvent = \{[\s\S]*type: 'done'[\s\S]*executionTracePresenter\.consume\(doneEvent\)/)
  assert.match(moduleFile, /ExecutionTracePresenterService/)
  assert.match(moduleFile, /ExecutionTraceBuilderService/)
})

test('AiMessage stores final executionTrace for history display', () => {
  const schema = readSource('prisma/schema.prisma')
  const aiMessage = schema.match(/model AiMessage \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(aiMessage, /executionTrace\s+Json\?/)
})

test('AgentChatService persists assistant executionTrace from runtime events', () => {
  const repository = readSource('src/modules/agent-chat/persistence/conversation.repository.ts')
  const service = readSource('src/modules/agent-chat/chat/agent-chat.service.ts')

  assert.match(repository, /executionTrace\?:\s*ExecutionTrace/)
  assert.match(repository, /executionTrace:\s*input\.executionTrace/)
  assert.match(service, /executionTraceBuilder\.buildFinalTrace/)
  assert.match(service, /executionTrace:\s*finalTrace/)
})

test('Execution trace exposes rewrite step with original and rewritten question detail', () => {
  const builder = readSource('src/ai-runtime/trace/execution-trace-builder.service.ts')

  assert.match(builder, /type:\s*'rewrite'/)
  assert.match(builder, /originalQuestion/)
  assert.match(builder, /rewrittenQuestion/)
  assert.match(builder, /rewriteApplied/)
  assert.match(builder, /const originalQuestion = input\.originalQuestion \|\| fallbackQuestion/)
  assert.match(builder, /const rewrittenQuestion = input\.rewrittenQuestion \|\| input\.standaloneQuestion \|\| originalQuestion/)
  assert.doesNotMatch(builder, /input\.query \|\| originalQuestion/)
})
