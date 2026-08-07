// 校验新版智能体运行上下文构建的静态合同。
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

test('AgentRuntimeRequest carries only explicit request input and no history', () => {
  const runtimeTypes = readSource('src/ai-runtime/agent-runtime.types.ts')

  assert.match(runtimeTypes, /^\/\/ 定义新版智能体运行时的统一入口参数。/)
  assert.match(runtimeTypes, /export type AgentRuntimeRequest/)
  assert.match(runtimeTypes, /message:\s*\{[\s\S]*content: string/)
  assert.match(runtimeTypes, /agent:\s*\{[\s\S]*code: string/)
  assert.match(runtimeTypes, /conversation:\s*\{[\s\S]*id\?: string/)
  assert.match(runtimeTypes, /metadata:\s*\{[\s\S]*requestId: string/)
  assert.doesNotMatch(runtimeTypes, /stream:\s*\{[\s\S]*enabled: boolean/)
  assert.doesNotMatch(runtimeTypes, /channel: string/)
  assert.doesNotMatch(runtimeTypes, /source: string/)
  assert.doesNotMatch(runtimeTypes, /createdAt: Date/)
  assert.doesNotMatch(runtimeTypes, /history:/)
})

test('AgentContext keeps runtime facts for planner and handlers', () => {
  const contextTypes = readSource('src/ai-runtime/context/agent-context.types.ts')

  assert.match(contextTypes, /^\/\/ 定义新版智能体运行时的统一上下文结构。/)
  assert.match(contextTypes, /export type AgentContext/)
  assert.match(contextTypes, /agent:/)
  assert.match(contextTypes, /user:/)
  assert.match(contextTypes, /conversation:/)
  assert.match(contextTypes, /message:\s*\{[\s\S]*content: string/)
  assert.match(contextTypes, /history: ChatMessage\[\]/)
  assert.doesNotMatch(contextTypes, /request: AgentRuntimeRequest/)
  assert.match(contextTypes, /prompt:/)
  assert.match(contextTypes, /model:/)
  assert.match(contextTypes, /capabilities:/)
  assert.match(contextTypes, /execution:/)
  assert.doesNotMatch(contextTypes, /stream: boolean/)
  assert.doesNotMatch(contextTypes, /temperature\?: number/)
  assert.doesNotMatch(contextTypes, /topP\?: number/)
  assert.match(contextTypes, /metadata:/)
})

test('ConversationRepository is the v2 history loader and cleans assistant history', () => {
  const repository = readSource('src/modules/agent-chat/persistence/conversation.repository.ts')

  assert.match(repository, /^\/\/ 读取新版智能体对话需要的会话历史数据。/)
  assert.match(repository, /class ConversationRepository/)
  assert.match(repository, /getHistoryMessages\(conversationId\?: string/)
  assert.match(repository, /prisma\.aiMessage\.findMany/)
  assert.match(repository, /orderBy:\s*\{ createdAt: 'desc' \}/)
  assert.match(repository, /\.reverse\(\)/)
  assert.match(repository, /item\.role === 'user' \|\| item\.role === 'assistant'/)
  assert.match(repository, /isCleanAssistantHistoryContent/)
  assert.match(repository, /ROLE_MARKER_PATTERN/)
  assert.doesNotMatch(repository, /ConversationService/)
  assert.doesNotMatch(repository, /ChatService/)
})

test('AgentContextBuilder resolves agent config through one v2 entrypoint', () => {
  const builder = readSource('src/ai-runtime/context/agent-context.builder.ts')

  assert.match(builder, /^\/\/ 构建新版智能体运行时所需的统一上下文。/)
  assert.match(builder, /class AgentContextBuilder/)
  assert.match(builder, /build\(request: AgentRuntimeRequest\)/)
  assert.match(builder, /prisma\.aiAgent\.findFirst/)
  assert.match(builder, /where:\s*\{ code: request\.agent\.code, status: 1 \}/)
  assert.match(builder, /prisma\.aiPrompt\.findFirst/)
  assert.match(builder, /modelResolver\.resolve\(agent\.modelConfigId, agent\.model\)/)
  assert.match(builder, /conversationRepository\.getHistoryMessages\(request\.conversation\.id/)
  assert.match(builder, /message:\s*\{[\s\S]*content: request\.message\.content/)
  assert.match(builder, /promptSnapshot/)
  assert.match(builder, /promptEnhancement/)
  assert.match(builder, /knowledgeBaseIds/)
  assert.match(builder, /workflowCode/)
  assert.match(builder, /toolCodes/)
  assert.doesNotMatch(builder, /\n\s*request,/)
  assert.doesNotMatch(builder, /stream: request\.stream\.enabled/)
  assert.doesNotMatch(builder, /execution:\s*\{[\s\S]*temperature/)
  assert.doesNotMatch(builder, /execution:\s*\{[\s\S]*topP/)
  assert.doesNotMatch(builder, /AgentRuntimeService/)
  assert.doesNotMatch(builder, /AgentPlanService/)
  assert.doesNotMatch(builder, /AgentExecutorService/)
  assert.doesNotMatch(builder, /ConversationService/)
})

test('AgentChatModule registers v2 context providers', () => {
  const moduleSource = readSource('src/modules/agent-chat/agent-chat.module.ts')

  assert.match(moduleSource, /AgentContextBuilder/)
  assert.match(moduleSource, /ConversationRepository/)
})
