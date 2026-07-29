// src/modules/auth/auth.transformer.ts

type PermissionLike = {
  code: string
}

type MenuButtonLike = {
  permission?: PermissionLike | null
}

type MenuLike = {
  id: string
  parentId: string | null
  name: string
  path: string | null
  component: string | null
  icon: string | null
  type: string
  buttons?: MenuButtonLike[]
}

export function buildPermissions(user: any, allPermissions: PermissionLike[] = []): string[] {
  if (user.isSuperAdmin) {
    return allPermissions.map((item) => item.code)
  }

  const set = new Set<string>()

  user.roles?.forEach((ur: any) => {
    ur.role?.permissions?.forEach((rp: any) => {
      if (rp.permission?.code) {
        set.add(rp.permission.code)
      }
    })
  })

  return Array.from(set)
}
export function buildMenus(user: any, allMenus: MenuLike[] = []) {
  if (user.isSuperAdmin) {
    return buildTree(
      allMenus.map((menu) => ({
        id: menu.id,
        parentId: menu.parentId,
        name: menu.name,
        path: menu.path,
        component: menu.component,
        icon: menu.icon,
        type: menu.type,
        buttons: (menu.buttons || [])
          .map((button) => button.permission?.code)
          .filter((code): code is string => Boolean(code)),
      })),
    )
  }

  // 1. 先按角色菜单权限收集可见菜单
  const menuMap = new Map()

  user.roles?.forEach((ur: any) => {
    const role = ur.role
    role?.menus?.forEach((mr: any) => {
      const menu = mr.menu
      if (!menu || menuMap.has(menu.id)) return

      menuMap.set(menu.id, {
        id: menu.id,
        parentId: menu.parentId,
        name: menu.name,
        path: menu.path,
        component: menu.component,
        icon: menu.icon,
        type: menu.type,
        buttons: [],
      })
    })

    role?.permissions?.forEach((rp: any) => {
      const permission = rp.permission
      if (!permission) return
      const code = permission.code

      permission.menuButtons?.forEach((mb: any) => {
        const menu = mb.menu
        if (!menu) return

        if (!menuMap.has(menu.id)) return

        const item = menuMap.get(menu.id)
        if (!item.buttons.includes(code)) {
          item.buttons.push(code)
        }
      })
    })
  })

  // 2. 转成数组
  const menuList = Array.from(menuMap.values())

  // 3. 生成树形结构
  return buildTree(menuList)
}

// =========================
// 工具函数：把扁平菜单转成树形
// =========================
function buildTree(menuList: any[]) {
  const tree: any[] = []
  const map = new Map()

  // 先把所有菜单放进 map
  menuList.forEach((menu) => {
    menu.children = []
    map.set(menu.id, menu)
  })

  // 遍历构建父子关系
  menuList.forEach((menu) => {
    const parent = map.get(menu.parentId)
    if (parent) {
      // 有父级 → 放进父级的 children
      parent.children.push(menu)
    } else {
      // 没有父级（parentId=null）→ 一级菜单
      tree.push(menu)
    }
  })

  return tree
}
// export function buildMenus(user: any) {
//   const menuMap = new Map();

//   user.role?.forEach((ur: any) => {
//     const role = ur.role;

//     role?.Permissions?.forEach((rp: any) => {
//       const permission = rp.permission;
//       if (!permission) return;

//       const code = permission.code;

//       permission.menuButtons?.forEach((mb: any) => {
//         const menu = mb.menu;
//         if (!menu) return;

//         if (!menuMap.has(menu.id)) {
//           menuMap.set(menu.id, {
//             id: menu.id,
//             name: menu.name,
//             path: menu.path,
//             component: menu.component,
//             icon: menu.icon,
//             buttons: []
//           });
//         }

//         const item = menuMap.get(menu.id);

//         if (!item.buttons.includes(code)) {
//           item.buttons.push(code);
//         }
//       });
//     });
//   });

//   return Array.from(menuMap.values());
// }
