// prisma/seeds/user.ts
import { prisma } from '../client'
import * as bcrypt from 'bcryptjs'

export async function seedUser(roleId: number) {
  console.log('初始化用户')

  const hashedPassword = await bcrypt.hash('xq19980212521', 10)

  const user = await prisma.user.upsert({
    where: { email: '208418289@qq.com' },
    update: {
      username: '管理员new',
      phone: '18567526786',
      avatar: '',
      isSuperAdmin: true,
      isDeleted: false,
      deletedAt: null,
    },
    create: {
      username: '管理员new',
      email: '208418289@qq.com',
      phone: '18567526786',
      password: hashedPassword,
      avatar: '',
      isSuperAdmin: true,
    },
  })

  await prisma.userRole.createMany({
    data: [{ userId: user.id, roleId }],
    skipDuplicates: true,
  })

  return { user }
}
