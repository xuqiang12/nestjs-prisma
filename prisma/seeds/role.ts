// prisma/seeds/role.ts
import { prisma } from '../client'

export async function seedRole(permissionId: number) {
  console.log('👉 初始化角色')

  const role = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
    },
  })

  await prisma.rolePermission.createMany({
    data: [
      {
        roleId: role.id,
        permissionId,
      },
    ],
    skipDuplicates: true,
  })

  return { role }
}
