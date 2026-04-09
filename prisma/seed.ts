import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始初始化数据...');

  // =========================
  // 1️⃣ 创建权限（可选，先给一个 Administrator）
  // =========================
  const adminPermission = await prisma.permission.upsert({
    where: { code: 'Administrator' },
    update: {},
    create: {
      code: 'Administrator',
      name: '超级管理员权限',
    },
  });

  // =========================
  // 2️⃣ 创建角色（超级管理员）
  // =========================
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
      Permissions: {
        create: [
          {
            permission: {
              connect: { id: adminPermission.id },
            },
          },
        ],
      },
    },
  });

  // =========================
  // 3️⃣ 加密密码
  // =========================
  const hashedPassword = await bcrypt.hash('xq19980212521', 10);

  // =========================
  // 4️⃣ 创建用户（小徐）
  // =========================
  const user = await prisma.user.upsert({
    where: { email: '208418289@qq.com' },
    update: {},
    create: {
      username: '小徐',
      email: '208418289@qq.com',
      phone: '18567526786',
      password: hashedPassword,
      avatar: 'https://example.com/avatar.jpg',

      // 👇 关键：绑定角色
      role: {
        create: [
          {
            role: {
              connect: { id: adminRole.id },
            },
          },
        ],
      },
    },
    include: {
      role: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log('✅ 超级管理员创建成功：');
  console.log(user);
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });