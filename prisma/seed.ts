// prisma/seed.ts
import { prisma } from './client'
import { seedPermissions } from './seeds/permission'
import { seedRole } from './seeds/role'
import { seedUser } from './seeds/user'
import { seedMenus } from './seeds/menu'

async function main() {
  console.log('🚀 开始初始化数据...')

  // 1️⃣ 权限
  const { permissions } = await seedPermissions()
  const addPermission = permissions.find((item) => item.code === 'system:user:add')

  // 2️⃣ 角色
  const { role } = await seedRole(permissions.map((item) => item.id))

  // 3️⃣ 用户
  await seedUser(role.id)

  // 4️⃣ 菜单 + 按钮
  await seedMenus(role.id, addPermission.id, permissions)

  console.log('✅ 初始化完成')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
