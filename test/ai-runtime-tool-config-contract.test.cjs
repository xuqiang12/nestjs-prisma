// 校验 Agent 和技能包保存工具配置时只接受可分配工具。
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

test('AgentService validates configurable tools by enabled agent exposure instead of existence only', () => {
  const service = read('src/modules/ai-platform/agent/agent.service.ts')

  assert.match(service, /this\.ensureConfigurableTools\(dto\.toolCodes/)
  assert.match(service, /private ensureConfigurableTools\(toolCodes\?: string\[\]\)/)
  assert.match(service, /this\.registry\.getTool\(code\)/)
  assert.match(service, /tool\.enabled/)
  assert.match(service, /tool\.exposure !== 'agent'/)
  assert.match(service, /工具不可配置/)
  assert.doesNotMatch(service, /private ensureKnownTools\(toolCodes\?: string\[\]\)/)
})

test('SkillPackageService uses the same configurable tool rule and cannot bypass AgentService', () => {
  const service = read('src/modules/ai-platform/skill-package/skill-package.service.ts')

  assert.match(service, /this\.ensureConfigurableTools\(dto\.toolCodes/)
  assert.match(service, /const effectiveToolCodes = Array\.from\(new Set\(\[\.\.\.agentToolCodes, \.\.\.toolCodes\]\)\)/)
  assert.match(service, /this\.ensureConfigurableTools\(effectiveToolCodes/)
  assert.match(service, /private ensureConfigurableTools\(toolCodes\?: string\[\]\)/)
  assert.match(service, /this\.registry\.getTool\(code\)/)
  assert.match(service, /tool\.enabled/)
  assert.match(service, /tool\.exposure !== 'agent'/)
  assert.match(service, /工具不可配置/)
  assert.doesNotMatch(service, /const toolNames = new Set\(this\.registry\.getToolNames\(\)\)/)
})

test('Tool management and agent options expose code and metadata without executable fields', () => {
  const toolService = read('src/modules/ai-platform/tool/tool.service.ts')
  const agentService = read('src/modules/ai-platform/agent/agent.service.ts')

  assert.match(toolService, /code:\s*tool\.code/)
  assert.match(toolService, /inputSchema:\s*tool\.inputSchema/)
  assert.match(toolService, /source:\s*tool\.source/)
  assert.match(toolService, /exposure:\s*tool\.exposure/)
  assert.match(toolService, /enabled:\s*tool\.enabled/)
  assert.doesNotMatch(toolService, /handler:\s*tool\.handler/)
  assert.doesNotMatch(toolService, /execute:\s*tool\.execute/)

  assert.match(agentService, /this\.registry\.listToolsByCodes\(this\.registry\.getToolCodes\(\)\)/)
  assert.match(agentService, /code:\s*tool\.code/)
  assert.match(agentService, /name:\s*tool\.name\s*\|\|\s*tool\.description\s*\|\|\s*tool\.code/)
})
