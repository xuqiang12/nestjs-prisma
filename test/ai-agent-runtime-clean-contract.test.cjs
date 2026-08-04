const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const { test } = require('node:test')
const assert = require('node:assert/strict')

const rootDir = join(__dirname, '..')
const read = (relativePath) => readFileSync(join(rootDir, relativePath), 'utf8')

test('clean agent runtime defines bounded plan and context contracts', () => {
  const types = read('src/ai-engine/agent/agent-runtime.types.ts')

  assert.match(types, /export type AgentPlanStepType = 'chat' \| 'knowledge' \| 'tool' \| 'workflow'/)
  assert.match(types, /export type AgentContext = \{/)
  assert.match(types, /maxSteps: number/)
  assert.match(types, /export type AgentPlan = \{/)
  assert.match(types, /steps: AgentPlanStep\[\]/)
  assert.match(types, /interface ExecutionLogger/)
  assert.doesNotMatch(types, /AgentCapability/)
  assert.doesNotMatch(types, /'skill'/)
})

test('planner is rule-led and limits plans to three steps', () => {
  const planPath = 'src/ai-engine/agent/agent-plan.service.ts'
  assert.equal(existsSync(join(rootDir, planPath)), true)
  assert.equal(existsSync(join(rootDir, 'src/ai-engine/agent/agent-planner.service.ts')), false)
  const planner = read(planPath)

  assert.match(planner, /MAX_AGENT_PLAN_STEPS = 3/)
  assert.match(planner, /workflowCode/)
  assert.match(planner, /requestedToolCode/)
  assert.match(planner, /knowledge\.enabled/)
  assert.doesNotMatch(planner, /LlmService/)
})

test('validator trusts only AgentContext for abilities and permissions', () => {
  const planPath = 'src/ai-engine/agent/agent-plan.service.ts'
  assert.equal(existsSync(join(rootDir, planPath)), true)
  assert.equal(existsSync(join(rootDir, 'src/ai-engine/agent/agent-plan-validator.service.ts')), false)
  const validator = read(planPath)

  assert.match(validator, /plan\.steps\.length > context\.maxSteps/)
  assert.match(validator, /context\.tools\.includes/)
  assert.match(validator, /context\.knowledge\.enabled/)
  assert.match(validator, /context\.workflow\?\.code/)
  assert.match(validator, /Tool execution is not allowed/)
})

test('executor reuses existing orchestrator, tool registry, and workflow runtime', () => {
  const executorPath = 'src/ai-engine/agent/agent-executor.service.ts'
  assert.equal(existsSync(join(rootDir, executorPath)), true)
  const executor = read(executorPath)

  assert.match(executor, /AiOrchestratorService/)
  assert.match(executor, /DefaultToolExecutor/)
  assert.match(executor, /WorkflowRuntimeService/)
  assert.match(executor, /buildCompletion/)
  assert.match(executor, /executeTool/)
  assert.doesNotMatch(executor, /VectorStoreService/)
})

test('response composer calls LLM instead of string-concatenating execution results', () => {
  const composerPath = 'src/ai-engine/agent/agent-response-composer.service.ts'
  assert.equal(existsSync(join(rootDir, composerPath)), true)
  const composer = read(composerPath)

  assert.match(composer, /aiOrchestratorService\.complete/)
  assert.match(composer, /User question: \$\{input\.message\}/)
  assert.match(composer, /ensureKnowledgeAnswer/)
  assert.doesNotMatch(composer, /return `.*execution result/i)
})

test('chat service delegates agent execution to runtime and keeps persistence duties', () => {
  const chatService = read('src/modules/knowledge-bot/chat/chat.service.ts')

  assert.doesNotMatch(chatService, /AiOrchestratorService/)
  assert.doesNotMatch(chatService, /WorkflowRuntimeService/)
  assert.match(chatService, /agentRuntimeService\.execute/)
  assert.match(chatService, /agentRuntimeService\.stream/)
  assert.match(chatService, /sensitiveWordCheckerService\.checkAndApply\(.*'input'/s)
  assert.match(chatService, /sensitiveWordCheckerService\.checkAndApply\(.*'output'/s)
  assert.match(chatService, /conversationService\.addMessage/)
})

test('execution log schema and migration keep only request-level summary', () => {
  const schema = read('prisma/schema.prisma')
  const migrationPath = 'prisma/migrations/20260803080000_add_ai_agent_execution_log/migration.sql'

  assert.match(schema, /model AiAgentExecutionLog \{/)
  assert.match(schema, /planJson\s+Json\?/)
  assert.match(schema, /durationMs\s+Int\?/)
  assert.match(schema, /messageId\s+String\?/)
  assert.doesNotMatch(schema, /model AiAgentExecutionStep/)
  assert.equal(existsSync(join(rootDir, migrationPath)), true)
  assert.match(read(migrationPath), /CREATE TABLE "AiAgentExecutionLog"/)
})
