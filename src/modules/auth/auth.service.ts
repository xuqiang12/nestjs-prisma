import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'nestjs-prisma';
import { LoginDto } from './dto/auth-login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(dto: LoginDto) {
    const { email, password } = dto;

    // 1. 查询用户 + 角色 + 权限
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            role: {
              include: {
                Permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('账号或密码错误');

    // 2. 校验密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('账号或密码错误');

    // 3. 提取角色 & 权限
    const roles = user.role.map((ur) => ur.role.name);
    const permissions = user.role.flatMap((ur) =>
      ur.role.Permissions.map((rp) => rp.permission.code),
    );
    // 4. 生成Token
    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles,
        permissions,
      },
    };
  }
}
