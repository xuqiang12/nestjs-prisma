// 这个文件统一执行项目初始化种子数据。
import { prisma } from './client'
import { seedPermissions } from './seeds/permission'
import { seedRole } from './seeds/role'
import { seedUser } from './seeds/user'
import { seedMenus } from './seeds/menu'
import { seedHomeDecorations } from './seeds/home'

// 根据命令参数执行完整初始化或单独恢复首页装修模板。
async function main() {
  if (process.argv.includes('--home')) {
    const result = await seedHomeDecorations()
    console.log(`首页装修模板初始化完成：${result.decorations} 个配置，${result.components} 个组件`)
    return
  }

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
