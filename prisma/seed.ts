import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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
      code: 'system:view',
      name: '系统管理',
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

  // ==================================================
  // ✅ 新增：这里插入你要的【系统管理】菜单数据
  // ==================================================
  // const systemMenu = await prisma.menu.upsert({
  //   where: { id: 1 }, // 因为 parentId=0 是第一条，id=1
  //   update: {},
  //   create: {
  //     parentId: 0,
  //     name: '系统管理',
  //     path: '/system',
  //     component: 'Layout',
  //     icon: 'Setting',
  //     sort: 1,
  //     type: 1,
  //   },
  // });
  const systemMenu = await prisma.menu.createMany({
    data: [
      // 第1条：系统管理（目录）
      {
        parentId: 0,
        name: '系统管理',
        path: '/system',
        component: 'Layout',
        icon: 'SettingOutlined',
        sort: 1,
        type: 1,
      },

      // 第2条：用户管理（页面）
      {
        parentId: 1, // 父级是 系统管理
        name: '菜单管理',
        path: '/system/menu/index',
        component: '/system/menu/index',
        icon: '',
        sort: 2,
        type: 2,
      },

      // 第3条：角色管理（页面）
      {
        parentId: 1,
        name: '角色管理',
        path: '/system/role/index',
        component: '/system/role/index',
        icon: '',
        sort: 3,
        type: 2,
      },

      // 第4条：菜单管理（页面）
      {
        parentId: 1,
        name: '用户管理',
        path: '/system/user/index',
        component: '/system/user/index',
        icon: '',
        sort: 4,
        type: 2,
      },
    ],
    skipDuplicates: true, // 避免重复插入
  });
  console.log('✅ 菜单【系统管理】创建成功：');
  console.log(systemMenu);

  // ==================================================
  // ✅ 新增：这里插入你要的【菜单按钮：新增】
  // ==================================================
  // const addButton = await prisma.menuButton.upsert({
  //   where: {
  //     // 联合唯一索引：menuId + permissionId
  //     menuId_permissionId: {
  //       menuId: 1,
  //       permissionId: 1,
  //     },
  //   },
  //   update: {},
  //   create: {
  //     menuId: 1, // 对应上面创建的系统管理菜单
  //     permissionId: 1, // 对应最开始创建的超级管理员权限
  //     name: '新增',
  //     sort: 1,
  //   },
  // });
  const addButton = await prisma.menuButton.createMany({
    data: [
      // 第1条：系统管理（目录）
      {
        menuId: 1, // 对应上面创建的系统管理菜单
        permissionId: 1, // 对应最开始创建的超级管理员权限
        name: '新增',
        sort: 1,
      },
      {
        menuId: 2, // 对应上面创建的系统管理菜单
        permissionId: 1, // 对应最开始创建的超级管理员权限
        name: '新增',
        sort: 1,
      },
      {
        menuId: 3, // 对应上面创建的系统管理菜单
        permissionId: 1, // 对应最开始创建的超级管理员权限
        name: '新增',
        sort: 1,
      },
      {
        menuId: 4,
        permissionId: 1,
        name: '新增',
        sort: 1,
      },
    ],
    skipDuplicates: true, // 避免重复插入
  });
  console.log('✅ 菜单按钮【新增】创建成功：');
  console.log(addButton);
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
