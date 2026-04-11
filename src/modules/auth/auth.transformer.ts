// src/modules/auth/auth.transformer.ts

export function buildPermissions(user: any): string[] {
  const set = new Set<string>();

  user.role?.forEach((ur: any) => {
    ur.role?.Permissions?.forEach((rp: any) => {
      if (rp.permission?.name) {
        set.add(rp.permission.name);
      }
    });
  });

  return Array.from(set);
}

export function buildMenus(user: any) {
  const menuMap = new Map();

  user.role?.forEach((ur: any) => {
    const role = ur.role;

    role?.Permissions?.forEach((rp: any) => {
      const permission = rp.permission;
      if (!permission) return;

      const code = permission.code;

      permission.menuButtons?.forEach((mb: any) => {
        const menu = mb.menu;
        if (!menu) return;

        if (!menuMap.has(menu.id)) {
          menuMap.set(menu.id, {
            id: menu.id,
            name: menu.name,
            path: menu.path,
            component: menu.component,
            icon: menu.icon,
            buttons: []
          });
        }

        const item = menuMap.get(menu.id);

        if (!item.buttons.includes(code)) {
          item.buttons.push(code);
        }
      });
    });
  });

  return Array.from(menuMap.values());
}