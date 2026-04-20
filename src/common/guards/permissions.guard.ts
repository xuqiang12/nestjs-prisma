// 权限守卫：用来控制接口是否有权限访问

import {
  CanActivate, // 守卫接口（必须实现 canActivate 方法）
  ExecutionContext, // 请求上下文（可以拿到 request / response）
  Injectable, // 让这个类可以被 Nest 注入
  ForbiddenException, // 403 异常（没权限用这个）
} from '@nestjs/common'

import { Reflector } from '@nestjs/core' // 用来读取装饰器里存的数据

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
// 👉 就是你之前定义的 'permissions'

@Injectable()
export class PermissionsGuard implements CanActivate {
  // 注入 Reflector，用来读取 @Permissions 里的数据
  constructor(private reflector: Reflector) {}

  // 每次请求都会执行这个方法
  canActivate(context: ExecutionContext): boolean {
    // ⭐ 从装饰器里获取“当前接口需要的权限”
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(), // 👉 当前方法（比如 controller 里的某个接口）
      context.getClass(), // 👉 当前 controller
    ])

    // 👉 如果这个接口没有写 @Permissions，就直接放行
    if (!requiredPermissions) return true

    // ⭐ 从 request 里拿当前登录用户
    // ⚠️ 前提：你已经有 JWT 登录，把 user 挂到 req 上了
    const { user } = context.switchToHttp().getRequest()
    // 👉 如果是管理员，直接放行
    if (user.isAdmin) return true
    // ⭐ 核心权限判断
    const hasPermission = requiredPermissions.every((p) => user.permissions.includes(p))

    /**
     * 解释一下这行：
     *
     * requiredPermissions = ['user:add', 'user:edit']
     * user.permissions = ['user:add', 'user:list']
     *
     * every 的意思是：
     * 👉 required 里的每一个，都必须在 user 里存在
     *
     * 所以这里结果是 false（因为没有 user:edit）
     */

    // 👉 没权限 → 抛异常（403）
    if (!hasPermission) {
      throw new ForbiddenException('无操作权限')
    }

    // 👉 有权限 → 放行
    return true
  }
}
