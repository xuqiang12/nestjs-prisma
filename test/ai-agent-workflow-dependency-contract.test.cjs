// 校验智能体保存时工作流依赖工具的配置合同。
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('agent save validates workflow required tools before persistence', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')

  assert.match(service, /await this\.ensureWorkflowRequiredTools\(dto\.workflowCode,\s*dto\.toolCodes\)/)
  assert.match(service, /private async ensureWorkflowRequiredTools\(workflowCode:\s*string \| undefined,\s*toolCodes\?:\s*string\[\]\)/)
  assert.match(service, /this\.collectWorkflowRequiredToolCodes\(workflow\.nodes\)/)
  assert.match(service, /工作流需要工具：\$\{missingTools\.join\('、'\)\}/)
})

test('agent config options expose workflow dependency metadata', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')

  assert.match(service, /nodes:\s*\{/)
  assert.match(service, /type:\s*true/)
  assert.match(service, /config:\s*true/)
  assert.match(service, /requiredToolCodes:\s*this\.collectWorkflowRequiredToolCodes\(workflow\.nodes\)/)
  assert.match(service, /promptIds:\s*this\.collectWorkflowPromptIds\(workflow\.nodes\)/)
})

test('workflow dependency extraction treats only tool nodes as required tools', () => {
  const service = readFileSync(join(rootDir, 'src/modules/ai-platform/agent/agent.service.ts'), 'utf8')

  assert.doesNotMatch(service, /node\.type === 'knowledge'/)
  assert.doesNotMatch(service, /requiredToolCodes\.add\('search_knowledge'\)/)
  assert.match(service, /node\.type === 'tool'/)
  assert.match(service, /requiredToolCodes\.add\(String\(config\.toolCode\)\)/)
})
