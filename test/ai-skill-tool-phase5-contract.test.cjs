// 校验 Phase 5 技能包只作为工具配置模板并复用现有 Tool Runtime。
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

test('Skill package install merges agent and skill tools before shared configurable validation', () => {
  const service = readSource('src/modules/ai-platform/skill-package/skill-package.service.ts')

  assert.match(service, /const agentToolCodes = this\.normalizeStringArray\(agent\.toolCodes\)/)
  assert.match(service, /const effectiveToolCodes = Array\.from\(new Set\(\[\.\.\.agentToolCodes, \.\.\.toolCodes\]\)\)/)
  assert.match(service, /this\.ensureConfigurableTools\(effectiveToolCodes\)/)
  assert.match(service, /toolCodes: effectiveToolCodes as Prisma\.InputJsonValue/)
  assert.doesNotMatch(service, /toolCodes\.length \? toolCodes : \(agent\.toolCodes as Prisma\.InputJsonValue\)/)
})

test('Skill package code does not own tool execution or source adapters', () => {
  const service = readSource('src/modules/ai-platform/skill-package/skill-package.service.ts')
  const controller = readSource('src/modules/ai-platform/skill-package/skill-package.controller.ts')
  const dto = readSource('src/modules/ai-platform/skill-package/dto/skill-package.dto.ts')
  const combined = [service, controller, dto].join('\n')

  assert.doesNotMatch(combined, /DefaultToolExecutor/)
  assert.doesNotMatch(combined, /BuiltinTool/)
  assert.doesNotMatch(combined, /RestToolAdapter/)
  assert.doesNotMatch(combined, /McpToolAdapter/)
  assert.doesNotMatch(combined, /\bfetch\(/)
  assert.doesNotMatch(combined, /mcpClient|callTool/)
})

test('Skill package code does not introduce tool selection or planner skill protocol', () => {
  const skillSource = [
    readSource('src/modules/ai-platform/skill-package/skill-package.service.ts'),
    readSource('src/modules/ai-platform/skill-package/skill-package.controller.ts'),
    readSource('src/modules/ai-platform/skill-package/dto/skill-package.dto.ts'),
  ].join('\n')
  const capabilityTypes = readSource('src/ai-runtime/capability/capability.types.ts')
  const planner = readSource('src/ai-runtime/planner/rule-planner.service.ts')

  assert.doesNotMatch(skillSource, /Tool Selection|SkillPlanner|PlannerSkillCatalog|skill selection/i)
  assert.doesNotMatch(capabilityTypes, /'skill'|"skill"/)
  assert.match(planner, /plannerToolCatalog/)
  assert.doesNotMatch(planner, /SkillPackage|AiSkillPackage|skillCatalog|PlannerSkillCatalog|SkillPlanner/)
})

test('Agent runtime continues to read agent tool codes instead of skill packages', () => {
  const runtime = readSource('src/ai-runtime/agent-runtime.service.ts')
  const contextBuilder = readSource('src/ai-runtime/context/agent-context.builder.ts')
  const capabilityResolver = readSource('src/ai-runtime/capability/capability-resolver.service.ts')
  const combined = [runtime, contextBuilder, capabilityResolver].join('\n')

  assert.match(contextBuilder, /toolCodes: Array\.isArray\(agent\.toolCodes\)/)
  assert.match(capabilityResolver, /listToolsByCodes\(context\.capabilities\.toolCodes\)/)
  assert.doesNotMatch(combined, /aiSkillPackage|AiSkillPackage|SkillPackage/)
})

test('No second skill executor registry or resolver is introduced', () => {
  const sourceFiles = [
    'src/modules/ai-platform/skill-package/skill-package.service.ts',
    'src/modules/ai-platform/skill-package/skill-package.controller.ts',
    'src/modules/ai-platform/skill-package/dto/skill-package.dto.ts',
    'src/ai-runtime/agent-runtime.service.ts',
    'src/ai-runtime/context/agent-context.builder.ts',
    'src/ai-runtime/capability/capability-resolver.service.ts',
    'src/ai-runtime/planner/rule-planner.service.ts',
    'src/ai-runtime/validator/agent-plan-validator.service.ts',
  ].map(readSource).join('\n')

  assert.doesNotMatch(sourceFiles, /SkillExecutor/)
  assert.doesNotMatch(sourceFiles, /SkillToolExecutor/)
  assert.doesNotMatch(sourceFiles, /SkillExecutionService/)
  assert.doesNotMatch(sourceFiles, /SkillToolRegistry/)
  assert.doesNotMatch(sourceFiles, /SkillToolResolver/)
})
