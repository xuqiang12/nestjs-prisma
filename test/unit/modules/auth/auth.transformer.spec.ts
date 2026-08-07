// 这个测试文件验证对应后端单元的关键行为。
import { buildMenus, buildPermissions } from 'src/modules/auth/auth.transformer'

describe('auth transformer', () => {
  it('deduplicates permissions and only attaches buttons to authorized menus', () => {
    const user = {
      roles: [
        {
          role: {
            menus: [
              {
                menu: {
      id: '1',
                  parentId: null,
                  name: 'System',
                  path: '/system',
                  component: '/system',
                  icon: 'system',
                  type: 'DIRECTORY',
                },
              },
              {
                menu: {
      id: '2',
      parentId: '1',
                  name: 'User',
                  path: '/system/user',
                  component: '/system/user/index',
                  icon: 'user',
                  type: 'PAGE',
                },
              },
            ],
            permissions: [
              {
                permission: {
                  code: 'system:user:create',
                  menuButtons: [
                { menu: { id: '2' } },
                  ],
                },
              },
              {
                permission: {
                  code: 'system:role:create',
                  menuButtons: [
                { menu: { id: '3' } },
                  ],
                },
              },
            ],
          },
        },
        {
          role: {
            menus: [
              {
                menu: {
      id: '2',
      parentId: '1',
                  name: 'User',
                  path: '/system/user',
                  component: '/system/user/index',
                  icon: 'user',
                  type: 'PAGE',
                },
              },
            ],
            permissions: [
              {
                permission: {
                  code: 'system:user:create',
                  menuButtons: [
                { menu: { id: '2' } },
                  ],
                },
              },
            ],
          },
        },
      ],
    }

    expect(buildPermissions(user)).toEqual(['system:user:create', 'system:role:create'])
    expect(buildMenus(user)).toEqual([
      {
      id: '1',
        parentId: null,
        name: 'System',
        path: '/system',
        component: '/system',
        icon: 'system',
        type: 'DIRECTORY',
        buttons: [],
        children: [
          {
      id: '2',
      parentId: '1',
            name: 'User',
            path: '/system/user',
            component: '/system/user/index',
            icon: 'user',
            type: 'PAGE',
            buttons: ['system:user:create'],
            children: [],
          },
        ],
      },
    ])
  })

  it('returns all permissions and menus for super admin without role bindings', () => {
    const user = {
      isSuperAdmin: true,
      roles: [],
    }
    const permissions = [
      { code: 'system:user:list' },
      { code: 'system:user:add' },
    ]
    const menus = [
      {
      id: '1',
        parentId: null,
        name: 'System',
        path: '/system',
        component: 'Layout',
        icon: 'system',
        type: 'DIRECTORY',
        buttons: [],
      },
      {
      id: '2',
      parentId: '1',
        name: 'User',
        path: '/system/user',
        component: '/system/user/index',
        icon: 'user',
        type: 'PAGE',
        buttons: [
          {
            permission: { code: 'system:user:add' },
          },
        ],
      },
    ]

    expect(buildPermissions(user, permissions)).toEqual(['system:user:list', 'system:user:add'])
    expect(buildMenus(user, menus)).toEqual([
      {
      id: '1',
        parentId: null,
        name: 'System',
        path: '/system',
        component: 'Layout',
        icon: 'system',
        type: 'DIRECTORY',
        buttons: [],
        children: [
          {
      id: '2',
      parentId: '1',
            name: 'User',
            path: '/system/user',
            component: '/system/user/index',
            icon: 'user',
            type: 'PAGE',
            buttons: ['system:user:add'],
            children: [],
          },
        ],
      },
    ])
  })
})
