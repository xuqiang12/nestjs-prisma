import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
export enum MenuType {
  DIRECTORY = 'DIRECTORY',
  PAGE = 'PAGE',
}

async function main() {
  console.log('🚀 开始初始化数据...')

  // =========================
  // 1️⃣ 权限
  // =========================
  const permission = await prisma.permission.upsert({
    where: { code: 'system:user:add' },
    update: {},
    create: {
      code: 'system:user:add',
      name: '新增用户',
    },
  })

  // =========================
  // 2️⃣ 角色
  // =========================
  const role = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: {
      name: 'Administrator',
    },
  })

  // =========================
  // 3️⃣ 绑定角色权限
  // =========================
  await prisma.rolePermission.createMany({
    data: [
      {
        roleId: role.id,
        permissionId: permission.id,
      },
    ],
    skipDuplicates: true,
  })

  // =========================
  // 4️⃣ 用户
  // =========================
  const hashedPassword = await bcrypt.hash('xq19980212521', 10)

  const user = await prisma.user.upsert({
    where: { email: '208418289@qq.com' },
    update: {},
    create: {
      username: '管理员new',
      email: '208418289@qq.com',
      phone: '18567526786',
      password: hashedPassword,
      avatar: '',

      roles: {
        create: [
          {
            role: {
              connect: { id: role.id },
            },
          },
        ],
      },
    },
  })

  // =========================
  // 5️⃣ 创建菜单（⭐必须一个个建）
  // =========================

  // 顶级：系统管理
  const systemMenu = await prisma.menu.create({
    data: {
      parentId: null,
      name: '系统管理',
      path: '/system',
      component: 'Layout',
      icon: 'Setting',
      sort: 1,
      type: MenuType.DIRECTORY,
    },
  })

  // 子菜单
  const menuList = await Promise.all([
    prisma.menu.create({
      data: {
        parentId: systemMenu.id,
        name: '用户管理',
        path: '/system/user/index',
        component: '/system/user/index',
        sort: 1,
        type: MenuType.PAGE,
      },
    }),
    prisma.menu.create({
      data: {
        parentId: systemMenu.id,
        name: '角色管理',
        path: '/system/role/index',
        component: '/system/role/index',
        sort: 2,
        type: MenuType.PAGE,
      },
    }),
    prisma.menu.create({
      data: {
        parentId: systemMenu.id,
        name: '菜单管理',
        path: '/system/menu/index',
        component: '/system/menu/index',
        sort: 3,
        type: MenuType.PAGE,
      },
    }),
  ])

  // =========================
  // 6️⃣ 角色绑定菜单（⭐重点）
  // =========================
  await prisma.menuRole.createMany({
    data: [
      { roleId: role.id, menuId: systemMenu.id },
      ...menuList.map((m) => ({
        roleId: role.id,
        menuId: m.id,
      })),
    ],
    skipDuplicates: true,
  })

  // =========================
  // 7️⃣ 创建按钮
  // =========================
  await prisma.menuButton.createMany({
    data: menuList.map((menu) => ({
      menuId: menu.id,
      permissionId: permission.id,
      name: '新增',
      sort: 1,
    })),
    skipDuplicates: true,
  })

  console.log('✅ 初始化完成')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
