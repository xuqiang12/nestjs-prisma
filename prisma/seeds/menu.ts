// prisma/seeds/menu.ts
import { prisma } from '../client'

export enum MenuType {
  DIRECTORY = 'DIRECTORY',
  PAGE = 'PAGE',
}

export async function seedMenus(roleId: number, permissionId: number) {
  console.log('👉 初始化菜单')

  // 顶级菜单
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

  // 绑定菜单权限
  await prisma.menuRole.createMany({
    data: [
      { roleId, menuId: systemMenu.id },
      ...menuList.map((m) => ({
        roleId,
        menuId: m.id,
      })),
    ],
    skipDuplicates: true,
  })

  // 按钮
  await prisma.menuButton.createMany({
    data: menuList.map((menu) => ({
      menuId: menu.id,
      permissionId,
      name: '新增',
      sort: 1,
    })),
    skipDuplicates: true,
  })

  return { systemMenu, menuList }
}
