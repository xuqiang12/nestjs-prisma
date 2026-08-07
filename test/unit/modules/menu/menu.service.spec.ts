// 这个测试文件验证对应后端单元的关键行为。
import { MenuService } from 'src/modules/menu/menu.service'

describe('MenuService', () => {
  it('returns menu tree with button objects on each menu row', async () => {
    const prisma = {
      menu: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, parentId: null, name: '系统管理', path: '/system', component: '', icon: 'system', sort: 1, type: 'DIRECTORY' },
          { id: 2, parentId: 1, name: '菜单管理', path: '/system/menu', component: '/system/menu/index', icon: 'menu', sort: 1, type: 'PAGE' },
        ]),
      },
      menuButton: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, menuId: 2, name: '新增', sort: 1, permissionId: 100, permission: { code: 'system:menu:create' } },
          { id: 11, menuId: 2, name: '删除', sort: 2, permissionId: 101, permission: { code: 'system:menu:delete' } },
        ]),
      },
    }
    const service = new MenuService(prisma as any)

    const tree = await service.getMenuTree()

    expect(tree).toEqual([
      {
        id: 1,
        parentId: null,
        name: '系统管理',
        path: '/system',
        component: '',
        icon: 'system',
        sort: 1,
        type: 'DIRECTORY',
        buttons: [],
        children: [
          {
            id: 2,
            parentId: 1,
            name: '菜单管理',
            path: '/system/menu',
            component: '/system/menu/index',
            icon: 'menu',
            sort: 1,
            type: 'PAGE',
            buttons: [
              { id: 10, menuId: 2, name: '新增', sort: 1, permissionId: 100, permissionCode: 'system:menu:create' },
              { id: 11, menuId: 2, name: '删除', sort: 2, permissionId: 101, permissionCode: 'system:menu:delete' },
            ],
            children: [],
          },
        ],
      },
    ])
    expect(prisma.menuButton.findMany).toHaveBeenCalledWith({
      include: {
        permission: {
          select: { code: true },
        },
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    })
  })
})
