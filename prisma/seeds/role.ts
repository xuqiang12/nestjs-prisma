// prisma/seeds/role.ts
import { prisma } from '../client'

export async function seedRole() {
  console.log('初始化角色')

  const role = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
    },
  })

  return { role }
}
