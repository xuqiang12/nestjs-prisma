// prisma/seeds/permission.ts
import { prisma } from '../client'

export async function seedPermissions() {
  console.log('👉 初始化权限')

  const permissions = await Promise.all(
    [
      { code: 'system:user:list', name: '查询用户列表' },
      { code: 'system:user:detail', name: '查询用户详情' },
      { code: 'system:user:add', name: '新增用户' },
      { code: 'system:user:edit', name: '修改用户' },
      { code: 'system:user:delete', name: '删除用户' },
      { code: 'ai:chat:send', name: '发送 AI 对话' },
      { code: 'ai:knowledge:list', name: '查询知识库列表' },
      { code: 'ai:knowledge:upload', name: '上传知识内容' },
      { code: 'ai:knowledge:delete', name: '删除知识内容' },
      { code: 'ai:knowledge:revector', name: '重新向量化知识内容' },
      { code: 'ai:knowledge:search', name: '检索知识库内容' },
    ].map((item) =>
      prisma.permission.upsert({
        where: { code: item.code },
        update: { name: item.name },
        create: item,
      }),
    ),
  )

  return { permissions }
}
