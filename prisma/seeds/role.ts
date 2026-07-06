// prisma/seeds/role.ts
import { prisma } from '../client'

export async function seedRole(permissionIds: number[]) {
  console.log('👉 初始化角色')

  const role = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
    },
  })

  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId: role.id,
      permissionId,
    })),
    skipDuplicates: true,
  })

  return { role }
}
