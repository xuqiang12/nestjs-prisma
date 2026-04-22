// 核心登录守卫
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const meta = Reflect.getMetadata('isPublic', context.getHandler())
    console.log(meta)
    console.log('url:', req.url)
    console.log('handler:', context.getHandler().name)

    // 公开接口直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    console.log(isPublic, IS_PUBLIC_KEY, 111)
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) throw new UnauthorizedException('请先登录')

    try {
      const payload = await this.jwtService.verifyAsync(token)
      request.user = payload
    } catch {
      throw new UnauthorizedException('登录已过期或无效')
    }

    return true
  }

  private extractToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization
    if (!authHeader) return undefined
    const [type, token] = authHeader.split(' ')
    return type === 'Bearer' ? token : undefined
  }
}
