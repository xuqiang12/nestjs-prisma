// 校验新数据库默认初始化会写入后台、移动端和 AI 基础配置。
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const rootDir = join(__dirname, '..')

function readProjectFile(path) {
  return readFileSync(join(rootDir, path), 'utf8')
}

// 默认 seed 应覆盖后台可用所需的菜单、首页、底部导航和 AI 基础配置。
test('default seed runs all bootstrap data seeds', () => {
  const seed = readProjectFile('prisma/seed.ts')

  assert.match(seed, /import \{ seedHomeDecorations \} from '\.\/seeds\/home'/)
  assert.match(seed, /import \{ seedMobileTabBarConfig \} from '\.\/seeds\/mobile-tabbar'/)
  assert.match(seed, /import \{ seedAiBaseData \} from '\.\/seeds\/ai'/)
  assert.match(seed, /await seedMenus\(permissions,\s*role\.id\)[\s\S]*await seedHomeDecorations\(\)[\s\S]*await seedMobileTabBarConfig\(\)[\s\S]*await seedAiBaseData\(\)/)
})

// 底部导航配置应作为数据库数据初始化，而不是只依赖服务层常量兜底。
test('mobile tabbar seed restores the editable default config', () => {
  const seedPath = join(rootDir, 'prisma/seeds/mobile-tabbar.ts')
  assert.ok(existsSync(seedPath), 'mobile tabbar seed should exist')

  const seed = readFileSync(seedPath, 'utf8')

  assert.match(seed, /export async function seedMobileTabBarConfig\(\)/)
  assert.match(seed, /prisma\.mobileTabBarConfig\.upsert/)
  assert.match(seed, /id:\s*'340740439936077981'/)
  assert.match(seed, /name:\s*'主导航栏'/)
  assert.match(seed, /status:\s*1/)
  assert.match(seed, /static\/tabbar\/home-normal\.png/)
  assert.match(seed, /static\/tabbar\/home-active\.png/)
  assert.match(seed, /static\/tabbar\/category-normal\.png/)
  assert.match(seed, /static\/tabbar\/category-active\.png/)
  assert.match(seed, /static\/tabbar\/ai-chat-normal\.png/)
  assert.match(seed, /static\/tabbar\/ai-chat-active\.png/)
  assert.match(seed, /static\/tabbar\/profile-normal\.png/)
  assert.match(seed, /static\/tabbar\/profile-active\.png/)
  assert.match(seed, /pagePath:\s*'\/pages\/aiChat\/index'/)
  assert.doesNotMatch(seed, /pagePath:\s*'\/pages\/cart\/index'/)
  assert.doesNotMatch(seed, /pagePath:\s*'\/pages\/buyerShow\/index'/)
})

// 校验后台编辑器允许选择小程序已发布的五个导航页面。
test('tabbar editor options expose the five released destinations', () => {
  const options = JSON.parse(readFileSync(join(rootDir, 'nacos/config/tabbar.json'), 'utf8'))

  assert.deepEqual(options.pageOptions, [
    { label: '首页', value: '/pages/index/index' },
    { label: '分类', value: '/pages/category/index' },
    { label: '工具', value: '/pages/tools/index' },
    { label: 'AI 对话', value: '/pages/aiChat/index' },
    { label: '我的', value: '/pages/mine/index' },
  ])
  assert.ok(options.iconOptions.some((item) => item.value === 'tools'))
})

// AI 基础配置应能用 seed 重建，且跨表引用应通过稳定 code 解析。
test('AI base seed restores model prompt agent and workflow configuration', () => {
  const seedPath = join(rootDir, 'prisma/seeds/ai.ts')
  assert.ok(existsSync(seedPath), 'AI base seed should exist')

  const seed = readFileSync(seedPath, 'utf8')

  assert.match(seed, /export async function seedAiBaseData\(\)/)
  assert.match(seed, /upsertModelProviders/)
  assert.match(seed, /upsertModelConfigs/)
  assert.match(seed, /upsertPrompts/)
  assert.match(seed, /upsertWorkflows/)
  assert.match(seed, /upsertAgents/)
  assert.match(seed, /code:\s*'siliconflow'/)
  assert.match(seed, /DEFAULT_MODEL_CONFIG_CODE = 'deepseek-v32-siliconflow'/)
  assert.match(seed, /code:\s*DEFAULT_MODEL_CONFIG_CODE/)
  assert.match(seed, /DEFAULT_PROMPT_CODE = 'TSC0000000000000005'/)
  assert.match(seed, /code:\s*DEFAULT_PROMPT_CODE/)
  assert.match(seed, /code:\s*'ZNT0000000000000001'/)
  assert.match(seed, /code:\s*'direct_answer_flow'/)
  assert.match(seed, /code:\s*'knowledge_service_flow'/)
  assert.doesNotMatch(seed, /promptId:\s*'34074043992768932[01]'/)
  assert.match(seed, /promptIdByCode\.get/)
  assert.match(seed, /modelConfigIdByCode\.get/)
})
