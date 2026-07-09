// prisma/seeds/menu.ts
import { prisma } from '../client'

export enum MenuType {
  DIRECTORY = 'DIRECTORY',
  PAGE = 'PAGE',
}

type SeedPermission = {
  id: number
  code: string
}

export async function seedMenus(roleId: number, permissionId: number, permissions: SeedPermission[] = []) {
  console.log('👉 初始化菜单')

  // 顶级菜单
  const systemMenu = await prisma.menu.create({
    data: {
      parentId: null,
      name: '系统管理',
      path: '/system',
      component: 'Layout',
      icon: 'HomeOutlined',
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
        icon: 'HomeOutlined',
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
        icon: 'HomeOutlined',
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
        icon: 'HomeOutlined',
        sort: 3,
        type: MenuType.PAGE,
      },
    }),
  ])

  // AI 模块菜单
  const aiMenu = await prisma.menu.create({
    data: {
      parentId: null,
      name: 'AI管理',
      path: '/ai',
      component: 'Layout',
      icon: 'HomeOutlined',
      sort: 30,
      type: MenuType.DIRECTORY,
    },
  })

  const aiMenuList = await Promise.all([
    prisma.menu.create({
      data: {
        parentId: aiMenu.id,
        name: 'AI对话',
        path: '/ai/chat/index',
        component: '/ai/chat/index',
        icon: 'HomeOutlined',
        sort: 1,
        type: MenuType.PAGE,
      },
    }),
    prisma.menu.create({
      data: {
        parentId: aiMenu.id,
        name: '知识库管理',
        path: '/ai/knowledge/index',
        component: '/ai/knowledge/index',
        icon: 'HomeOutlined',
        sort: 2,
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
      { roleId, menuId: aiMenu.id },
      ...aiMenuList.map((m) => ({
        roleId,
        menuId: m.id,
      })),
    ],
    skipDuplicates: true,
  })

  const permissionIdMap = new Map(permissions.map((item) => [item.code, item.id]))
  const aiChatMenu = aiMenuList[0]
  const aiKnowledgeMenu = aiMenuList[1]
  const aiButtonList = [
    { menuId: aiChatMenu.id, permissionId: permissionIdMap.get('ai:chat:send'), name: '发送', sort: 1 },
    { menuId: aiKnowledgeMenu.id, permissionId: permissionIdMap.get('ai:knowledge:list'), name: '查询', sort: 1 },
    { menuId: aiKnowledgeMenu.id, permissionId: permissionIdMap.get('ai:knowledge:upload'), name: '上传', sort: 2 },
    { menuId: aiKnowledgeMenu.id, permissionId: permissionIdMap.get('ai:knowledge:delete'), name: '删除', sort: 3 },
    { menuId: aiKnowledgeMenu.id, permissionId: permissionIdMap.get('ai:knowledge:revector'), name: '重向量', sort: 4 },
    { menuId: aiKnowledgeMenu.id, permissionId: permissionIdMap.get('ai:knowledge:search'), name: '检索', sort: 5 },
  ].filter((item): item is { menuId: number; permissionId: number; name: string; sort: number } => Boolean(item.permissionId))

  // 按钮
  await prisma.menuButton.createMany({
    data: [
      ...menuList.map((menu) => ({
        menuId: menu.id,
        permissionId,
        name: '新增',
        sort: 1,
      })),
      ...aiButtonList,
    ],
    skipDuplicates: true,
  })

  return { systemMenu, menuList, aiMenu, aiMenuList }
}
