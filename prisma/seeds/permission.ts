// prisma/seeds/permission.ts
import { prisma } from '../client'

export async function seedPermissions() {
  console.log('👉 初始化权限')

  const permission = await prisma.permission.upsert({
    where: { code: 'system:user:add' },
    update: {},
    create: {
      code: 'system:user:add',
      name: '新增用户',
    },
  })

  return { permission }
}
