import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ToolDefinition } from '../../../../ai-engine/core/interfaces'

// 查询用户菜单权限工具 - 支持依赖注入
@Injectable()
export class GetUserMenuPermissionsTool {
  // 注入 PrismaService，用于在工具执行时读取真实用户角色和菜单关系。
  constructor(private prisma: PrismaService) {}

  // 获取工具定义
  getToolDefinition(): ToolDefinition {
    return {
      name: 'get_user_menu_permissions',
      description: '查询指定用户拥有的菜单权限',
      params: { userId: '用户ID（整数）' },
      handler: async (params: any) => {
        return this.execute(params)
      },
    }
  }

  // 执行工具逻辑
  async execute(params: { userId: number | string }) {
    console.log('[GetUserMenuPermissionsTool] 查询用户菜单权限，原始 userId:', params.userId, '类型:', typeof params.userId)

    try {
      // 确保 userId 是数字
      const userId = typeof params.userId === 'string' ? parseInt(params.userId, 10) : params.userId
      console.log('[GetUserMenuPermissionsTool] 转换后的 userId:', userId)

      // 查询用户拥有的菜单权限
      const userWithMenus = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  menus: {
                    include: {
                      menu: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!userWithMenus) {
        return { success: false, message: `用户 ${params.userId} 不存在` }
      }

      // 收集所有菜单（去重）
      const menuSet = new Set<number>()
      const menus: any[] = []

      userWithMenus.roles.forEach((userRole) => {
        userRole.role.menus.forEach((menuRole) => {
          if (!menuSet.has(menuRole.menuId)) {
            menuSet.add(menuRole.menuId)
            menus.push(menuRole.menu)
          }
        })
      })

      // 构建菜单树
      const menuTree = this.buildMenuTree(menus)

      console.log('[GetUserMenuPermissionsTool] 查询完成，找到', menus.length, '个菜单')

      return {
        success: true,
        userId: params.userId,
        username: userWithMenus.username,
        menuCount: menus.length,
        menus,
        menuTree,
      }
    } catch (error) {
      console.error('[GetUserMenuPermissionsTool] 查询失败:', error)
      return { success: false, message: '查询用户菜单权限失败', error: String(error) }
    }
  }

  // 构建菜单树
  private buildMenuTree(menus: any[], parentId: number | null = null) {
    return menus
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildMenuTree(menus, item.id),
      }))
  }
}
