// 校验首页配置后台列表接口分页和搜索合同。
const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const rootDir = join(__dirname, '..')

test('home decoration list query accepts pagination and search fields', () => {
  const dto = readFileSync(join(rootDir, 'src/modules/home/dto/query.dto.ts'), 'utf8')

  assert.match(dto, /pageNum\?: number/)
  assert.match(dto, /pageSize\?: number/)
  assert.match(dto, /name\?: string/)
  assert.match(dto, /status\?: number/)
  assert.match(dto, /scene\?: string/)
})

test('home decoration list returns a paged response with filters', () => {
  const service = readFileSync(join(rootDir, 'src/modules/home/home.service.ts'), 'utf8')

  assert.match(service, /formatPage/)
  assert.match(service, /const pageNum = Number\(query\.pageNum \|\| 1\)/)
  assert.match(service, /const pageSize = Number\(query\.pageSize \|\| 10\)/)
  assert.match(service, /name: query\.name \? \{ contains: query\.name, mode: 'insensitive' as const \} : undefined/)
  assert.match(service, /status: query\.status !== undefined \? Number\(query\.status\) : undefined/)
  assert.match(service, /skip: \(pageNum - 1\) \* pageSize/)
  assert.match(service, /take: pageSize/)
  assert.match(service, /this\.prisma\.homeDecoration\.count\(\{ where \}\)/)
  assert.match(service, /return formatPage\(list, total, pageNum, pageSize\)/)
})
