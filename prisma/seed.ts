// prisma/seed.ts
import { prisma } from './client'
import { seedPermissions } from './seeds/permission'
import { seedRole } from './seeds/role'
import { seedUser } from './seeds/user'
import { seedMenus } from './seeds/menu'

async function main() {
  console.log('开始初始化数据...')

  const { permissions } = await seedPermissions()
  const { role } = await seedRole()

  await seedUser(role.id)
  await seedMenus(permissions, role.id)

  console.log('初始化完成')
}

main()
  .catch((e) => {
    console.error('初始化失败', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
