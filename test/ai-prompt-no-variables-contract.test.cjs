const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

const files = {
  schema: 'prisma/schema.prisma',
  promptDto: 'src/modules/ai-platform/prompt/dto/prompt.dto.ts',
  promptService: 'src/modules/ai-platform/prompt/prompt.service.ts',
  agentRuntime: 'src/ai-engine/agent/agent-runtime.service.ts',
  workflowExecutor: 'src/ai-engine/workflow/workflow-executor.service.ts',
  aiEngineModule: 'src/ai-engine/ai-engine.module.ts',
}

Object.entries(files).forEach(([name, relativePath]) => {
  const source = read(relativePath)
  assert(!source.includes('variables'), `${name} should not reference prompt variables`)
  assert(!source.includes('PromptRendererService'), `${name} should not reference PromptRendererService`)
})

assert(!fs.existsSync(path.join(rootDir, 'src/ai-engine/prompt/prompt-renderer.service.ts')), 'prompt renderer service should be removed')

process.stdout.write('ok - ai prompt variables removed\n')
