// prisma/seeds/menu.ts
import { prisma } from '../client'

export enum MenuType {
  DIRECTORY = 'DIRECTORY',
  PAGE = 'PAGE',
}

type MenuSeed = {
  name: string
  path: string
  component: string
  icon: string
  sort: number
  type: MenuType
  parentPath?: string
}

type ButtonSeed = {
  menuPath: string
  permissionCode: string
  name: string
  sort: number
}

type SeedPermission = {
  id: number
  code: string
}

const menuSeeds: MenuSeed[] = [
  {
    name: '系统管理',
    path: '/system',
    component: 'Layout',
    icon: 'el-icon-set-up',
    sort: 1,
    type: MenuType.DIRECTORY,
  },
  {
    name: '菜单管理',
    path: '/system/menu/index',
    component: '/system/menu/index',
    icon: 'HomeOutlined',
    sort: 0,
    type: MenuType.PAGE,
    parentPath: '/system',
  },
  {
    name: '用户管理',
    path: '/system/user/index',
    component: '/system/user/index',
    icon: 'HomeOutlined',
    sort: 1,
    type: MenuType.PAGE,
    parentPath: '/system',
  },
  {
    name: '角色管理',
    path: '/system/role/index',
    component: '/system/role/index',
    icon: 'HomeOutlined',
    sort: 2,
    type: MenuType.PAGE,
    parentPath: '/system',
  },
  {
    name: 'AI模块',
    path: '/AIEngine',
    component: 'Layout',
    icon: 'cms-ai',
    sort: 0,
    type: MenuType.DIRECTORY,
  },
  {
    name: 'AI对话',
    path: '/AIEngine/chat/index',
    component: '/AIEngine/chat/index',
    icon: '',
    sort: 0,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '知识库管理',
    path: '/AIEngine/knowledge/index',
    component: '/AIEngine/knowledge/index',
    icon: '',
    sort: 0,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
]

const buttonSeeds: ButtonSeed[] = [
  { menuPath: '/system/user/index', permissionCode: 'system:user:add', name: '新增', sort: 1 },
  { menuPath: '/system/role/index', permissionCode: 'system:role:add', name: '新增', sort: 1 },
  { menuPath: '/system/menu/index', permissionCode: 'system:menu:add', name: '新增', sort: 1 },
]

export async function seedMenus(permissions: SeedPermission[] = []) {
  console.log('初始化菜单')

  const menuMap = new Map<string, { id: number }>()

  for (const item of menuSeeds) {
    const parentId = item.parentPath ? menuMap.get(item.parentPath)?.id : null
    const existed = await prisma.menu.findFirst({ where: { path: item.path } })
    const data = {
      parentId,
      name: item.name,
      path: item.path,
      component: item.component,
      icon: item.icon,
      sort: item.sort,
      type: item.type,
    }
    const menu = existed
      ? await prisma.menu.update({ where: { id: existed.id }, data })
      : await prisma.menu.create({ data })

    menuMap.set(item.path, menu)
  }

  const permissionIdMap = new Map(permissions.map((item) => [item.code, item.id]))

  for (const item of buttonSeeds) {
    const menuId = menuMap.get(item.menuPath)?.id
    const permissionId = permissionIdMap.get(item.permissionCode)
    if (!menuId || !permissionId) continue

    await prisma.menuButton.upsert({
      where: { permissionId },
      update: {
        menuId,
        name: item.name,
        sort: item.sort,
      },
      create: {
        menuId,
        permissionId,
        name: item.name,
        sort: item.sort,
      },
    })
  }
}
