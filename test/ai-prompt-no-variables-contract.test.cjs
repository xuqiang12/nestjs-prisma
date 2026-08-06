// 校验提示词变量渲染旧链路没有被重新引入。
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

const files = {
  schema: 'prisma/schema.prisma',
  promptDto: 'src/modules/ai-config/prompt/dto/prompt.dto.ts',
  promptService: 'src/modules/ai-config/prompt/prompt.service.ts',
  agentRuntime: 'src/ai-runtime/agent-runtime.service.ts',
  agentContext: 'src/ai-runtime/context/agent-context.builder.ts',
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
