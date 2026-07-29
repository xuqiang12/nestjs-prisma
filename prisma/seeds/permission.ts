// prisma/seeds/permission.ts
import { prisma } from '../client'

const permissionSeeds = [
  { code: 'system:user:list', name: '查询用户列表' },
  { code: 'system:user:detail', name: '查询用户详情' },
  { code: 'system:user:add', name: '新增用户' },
  { code: 'system:user:edit', name: '修改用户' },
  { code: 'system:user:delete', name: '删除用户' },
  { code: 'system:role:add', name: '新增角色' },
  { code: 'system:menu:add', name: '新增菜单' },
  { code: 'ai:chat:send', name: '发送 AI 对话' },
  { code: 'ai:knowledge:list', name: '查询知识库列表' },
  { code: 'ai:knowledge:upload', name: '上传知识内容' },
  { code: 'ai:knowledge:delete', name: '删除知识内容' },
  { code: 'ai:knowledge:revector', name: '重新向量化知识内容' },
  { code: 'ai:knowledge:search', name: '检索知识库内容' },
  { code: 'ai:prompt:list', name: '查询提示词列表' },
  { code: 'ai:prompt:add', name: '新增提示词' },
  { code: 'ai:prompt:update', name: '修改提示词' },
  { code: 'ai:prompt:status', name: '修改提示词状态' },
  { code: 'ai:sensitive-word:list', name: '查询敏感词列表' },
  { code: 'ai:sensitive-word:add', name: '新增敏感词' },
  { code: 'ai:sensitive-word:update', name: '修改敏感词' },
  { code: 'ai:sensitive-word:status', name: '修改敏感词状态' },
  { code: 'ai:agent:list', name: '查询智能体列表' },
  { code: 'ai:agent:add', name: '新增智能体' },
  { code: 'ai:agent:update', name: '修改智能体' },
  { code: 'ai:agent:status', name: '修改智能体状态' },
  { code: 'ai:tool:list', name: '查询AI工具列表' },
  { code: 'ai:workflow:list', name: '查询工作流列表' },
  { code: 'ai:workflow:add', name: '新增工作流' },
  { code: 'ai:workflow:update', name: '修改工作流' },
  { code: 'ai:workflow:status', name: '修改工作流状态' },
  { code: 'ai:workflow:test', name: '测试运行工作流' },
  { code: 'ai:workflow-run:list', name: '查询工作流运行记录' },
  { code: 'ai:workflow-run:detail', name: '查询工作流运行详情' },
]

export async function seedPermissions() {
  console.log('初始化权限')

  const permissions = await Promise.all(
    permissionSeeds.map((item) =>
      prisma.permission.upsert({
        where: { code: item.code },
        update: { name: item.name },
        create: item,
      }),
    ),
  )

  return { permissions }
}
