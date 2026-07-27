const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('workflow list exposes node and edge counts for admin table', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/workflow/workflow.service.ts'), 'utf8')

  assert.match(service, /_count:\s*\{\s*select:\s*\{\s*nodes:\s*true,\s*edges:\s*true\s*\}/)
  assert.match(service, /nodeCount:\s*item\._count\.nodes/)
  assert.match(service, /edgeCount:\s*item\._count\.edges/)
})

test('workflow test-run keeps authenticated user context', () => {
  const controller = readFileSync(join(rootDir, 'src/modules/ai-platform/workflow/workflow.controller.ts'), 'utf8')
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/workflow/workflow.service.ts'), 'utf8')

  assert.match(controller, /@Req\(\)\s*req:\s*AuthenticatedRequest/)
  assert.match(controller, /this\.workflowService\.testRun\(dto,\s*req\.user\.userId\)/)
  assert.match(service, /async testRun\(dto:\s*TestRunWorkflowDto,\s*userId:\s*number\)/)
  assert.match(service, /userId,/)
})

test('tool list endpoint returns metadata without handlers', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/tool/tool.service.ts'), 'utf8')
  const controller = readFileSync(join(rootDir, 'src/modules/ai-platform/tool/tool.controller.ts'), 'utf8')
  const permissionSeed = readFileSync(join(rootDir, 'prisma/seeds/permission.ts'), 'utf8')
  const menuSeed = readFileSync(join(rootDir, 'prisma/seeds/menu.ts'), 'utf8')

  assert.match(service, /this\.registry\.listTools\(\)\.map/)
  assert.match(service, /name:\s*tool\.name/)
  assert.match(service, /description:\s*tool\.description/)
  assert.match(service, /params:\s*tool\.params/)
  assert.doesNotMatch(service, /handler:\s*tool\.handler/)
  assert.match(controller, /@Permissions\('ai:tool:list'\)/)
  assert.match(permissionSeed, /code:\s*'ai:tool:list'/)
  assert.match(menuSeed, /path:\s*'\/AIEngine\/tool\/index'/)
  assert.match(menuSeed, /permissionCode:\s*'ai:tool:list'/)
})

test('agent config tool options use tool descriptions as display names', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')

  assert.match(service, /this\.registry\.listTools\(\)\.map/)
  assert.match(service, /code:\s*tool\.name/)
  assert.match(service, /name:\s*tool\.description\s*\|\|\s*tool\.name/)
})
