import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'nestjs-prisma';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'YOUR_SECRET_KEY_2025', // 必须和 auth.module 一致！
    });
  }

  // Token 验证成功后，自动执行这里
  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(payload.sub) },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在或token无效');
    }

    // 返回的内容会自动挂到 req.user
    return user;
  }
}
