// 权限守卫
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasPermission = requiredPermissions.every((p) =>
      user.permissions.includes(p),
    );

    if (!hasPermission) throw new ForbiddenException('无操作权限');
    return true;
  }
}
