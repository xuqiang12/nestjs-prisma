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
  legacyPaths?: string[]
}

type ButtonSeed = {
  menuPath: string
  permissionCode: string
  name: string
  sort: number
}

type SeedPermission = {
  id: string
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
  {
    name: '提示词管理',
    path: '/AIEngine/prompt/index',
    component: '/AIEngine/prompt/index',
    icon: '',
    sort: 1,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '敏感词管理',
    path: '/AIEngine/sensitiveWord/index',
    component: '/AIEngine/sensitiveWord/index',
    icon: '',
    sort: 2,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '运行方案配置',
    path: '/AIEngine/agent/index',
    component: '/AIEngine/agent/index',
    icon: '',
    sort: 3,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '工具管理',
    path: '/AIEngine/tool/index',
    component: '/AIEngine/tool/index',
    icon: '',
    sort: 4,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '工作流管理',
    path: '/AIEngine/workflow/index',
    component: '/AIEngine/workflow/index',
    icon: '',
    sort: 5,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '技能包管理',
    path: '/AIEngine/skillPackage/index',
    component: '/AIEngine/skillPackage/index',
    icon: '',
    sort: 6,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '运行日志',
    path: '/AIEngine/workflowRun/index',
    component: '/AIEngine/workflowRun/index',
    icon: '',
    sort: 7,
    type: MenuType.PAGE,
    parentPath: '/AIEngine',
  },
  {
    name: '移动端',
    path: '/mobile',
    component: 'Layout',
    icon: 'el-icon-mobile-phone',
    sort: 2,
    type: MenuType.DIRECTORY,
  },
  {
    name: '首页配置',
    path: '/mobile/homeConfig/index',
    component: '/mobile/homeConfig/index',
    icon: '',
    sort: 0,
    type: MenuType.PAGE,
    parentPath: '/mobile',
    legacyPaths: ['/mobile/homeConfig'],
  },
  {
    name: '底部导航配置',
    path: '/mobile/tabBar/index',
    component: '/mobile/tabBar/index',
    icon: 'el-icon-menu',
    sort: 1,
    type: MenuType.PAGE,
    parentPath: '/mobile',
    legacyPaths: ['/mobile/tabBar'],
  },
]

const buttonSeeds: ButtonSeed[] = [
  { menuPath: '/system/user/index', permissionCode: 'system:user:add', name: '新增', sort: 1 },
  { menuPath: '/system/role/index', permissionCode: 'system:role:add', name: '新增', sort: 1 },
  { menuPath: '/system/menu/index', permissionCode: 'system:menu:add', name: '新增', sort: 1 },
  { menuPath: '/AIEngine/chat/index', permissionCode: 'ai:chat:send', name: '发送', sort: 1 },
  { menuPath: '/AIEngine/knowledge/index', permissionCode: 'ai:knowledge:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/knowledge/index', permissionCode: 'ai:knowledge:upload', name: '上传', sort: 2 },
  { menuPath: '/AIEngine/knowledge/index', permissionCode: 'ai:knowledge:delete', name: '删除', sort: 3 },
  { menuPath: '/AIEngine/knowledge/index', permissionCode: 'ai:knowledge:revector', name: '重新向量化', sort: 4 },
  { menuPath: '/AIEngine/knowledge/index', permissionCode: 'ai:knowledge:search', name: '检索', sort: 5 },
  { menuPath: '/AIEngine/prompt/index', permissionCode: 'ai:prompt:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/prompt/index', permissionCode: 'ai:prompt:add', name: '新增', sort: 2 },
  { menuPath: '/AIEngine/prompt/index', permissionCode: 'ai:prompt:update', name: '修改', sort: 3 },
  { menuPath: '/AIEngine/prompt/index', permissionCode: 'ai:prompt:status', name: '启停', sort: 4 },
  { menuPath: '/AIEngine/sensitiveWord/index', permissionCode: 'ai:sensitive-word:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/sensitiveWord/index', permissionCode: 'ai:sensitive-word:add', name: '新增', sort: 2 },
  { menuPath: '/AIEngine/sensitiveWord/index', permissionCode: 'ai:sensitive-word:update', name: '修改', sort: 3 },
  { menuPath: '/AIEngine/sensitiveWord/index', permissionCode: 'ai:sensitive-word:status', name: '启停', sort: 4 },
  { menuPath: '/AIEngine/agent/index', permissionCode: 'ai:agent:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/agent/index', permissionCode: 'ai:agent:add', name: '新增', sort: 2 },
  { menuPath: '/AIEngine/agent/index', permissionCode: 'ai:agent:update', name: '修改', sort: 3 },
  { menuPath: '/AIEngine/agent/index', permissionCode: 'ai:agent:status', name: '启停', sort: 4 },
  { menuPath: '/AIEngine/tool/index', permissionCode: 'ai:tool:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/workflow/index', permissionCode: 'ai:workflow:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/workflow/index', permissionCode: 'ai:workflow:add', name: '新增', sort: 2 },
  { menuPath: '/AIEngine/workflow/index', permissionCode: 'ai:workflow:update', name: '修改', sort: 3 },
  { menuPath: '/AIEngine/workflow/index', permissionCode: 'ai:workflow:status', name: '启停', sort: 4 },
  { menuPath: '/AIEngine/workflow/index', permissionCode: 'ai:workflow:test', name: '测试运行', sort: 5 },
  { menuPath: '/AIEngine/skillPackage/index', permissionCode: 'ai:skill-package:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/skillPackage/index', permissionCode: 'ai:skill-package:add', name: '新增', sort: 2 },
  { menuPath: '/AIEngine/skillPackage/index', permissionCode: 'ai:skill-package:update', name: '修改', sort: 3 },
  { menuPath: '/AIEngine/skillPackage/index', permissionCode: 'ai:skill-package:status', name: '启停', sort: 4 },
  { menuPath: '/AIEngine/skillPackage/index', permissionCode: 'ai:skill-package:install', name: '安装', sort: 5 },
  { menuPath: '/AIEngine/workflowRun/index', permissionCode: 'ai:workflow-run:list', name: '查询', sort: 1 },
  { menuPath: '/AIEngine/workflowRun/index', permissionCode: 'ai:workflow-run:detail', name: '详情', sort: 2 },
]

export async function seedMenus(permissions: SeedPermission[] = [], roleId?: string) {
  console.log('初始化菜单')

  const menuMap = new Map<string, { id: string }>()

  for (const item of menuSeeds) {
    const parentId = item.parentPath ? menuMap.get(item.parentPath)?.id : null
    const searchPaths = [item.path].concat(item.legacyPaths || [])
    const existed = await prisma.menu.findFirst({ where: { OR: searchPaths.map((path) => ({ path })) } })
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

  if (roleId) {
    await prisma.menuRole.createMany({
      data: Array.from(menuMap.values()).map((menu) => ({
        menuId: menu.id,
        roleId,
      })),
      skipDuplicates: true,
    })
  }
}
