const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert')

const root = path.resolve(__dirname, '..')

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist') return []
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(fullPath)
    return /\.(ts|js|cjs)$/.test(entry.name) ? [fullPath] : []
  })
}

test('legacy hardcoded ai prompts module is removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'src/ai-engine/prompts.ts')), false)
})

test('runtime code does not import legacy hardcoded ai prompts module', () => {
  const files = collectFiles(path.join(root, 'src'))
  const references = files
    .map((file) => [file, fs.readFileSync(file, 'utf8')])
    .filter(([, content]) => /ai-engine\/prompts|\.\/prompts|PROMPTS/.test(content))
    .map(([file]) => path.relative(root, file))

  assert.deepEqual(references, [])
})
