// 提供运行时内置用户菜单权限查询工具。
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { BuiltinTool, ToolDefinition, ToolRuntimeContext } from '../tool.types'

@Injectable()
export class GetUserMenuPermissionsTool implements BuiltinTool {
  definition: ToolDefinition = {
    code: 'get_user_menu_permissions',
    name: '查询用户菜单权限',
    description: '查询当前用户拥有的菜单权限',
    source: 'builtin',
    exposure: 'agent',
    enabled: true,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    params: {},
  }

  // 注入 PrismaService，用于在工具执行时读取真实用户角色和菜单关系。
  constructor(private prisma: PrismaService) {}

  // 返回运行时工具注册表可识别的用户菜单权限工具定义。
  getToolDefinition(): ToolDefinition {
    return this.definition
  }

  // 查询指定用户的角色菜单并返回扁平列表和菜单树。
  async execute(_input: unknown, context: ToolRuntimeContext) {
    try {
      // 查询用户拥有的菜单权限
      const userWithMenus = await this.prisma.user.findUnique({
        where: { id: context.userId },
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
        return { success: false, message: `用户 ${context.userId} 不存在` }
      }

      // 收集所有菜单（去重）
      const menuSet = new Set<string>()
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

      return {
        success: true,
        userId: context.userId,
        username: userWithMenus.username,
        menuCount: menus.length,
        menus,
        menuTree,
      }
    } catch (error) {
      return { success: false, message: '查询用户菜单权限失败', error: String(error) }
    }
  }

  // 按父子关系把菜单列表组装成树。
  private buildMenuTree(menus: any[], parentId: string | null = null) {
    return menus
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildMenuTree(menus, item.id),
      }))
  }
}
