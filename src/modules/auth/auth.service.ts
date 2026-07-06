import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from 'nestjs-prisma'
import { LoginDto } from './dto/auth-login.dto'
import { buildMenus, buildPermissions } from './auth.transformer'

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(dto: LoginDto) {
    const { email, password } = dto

    // 1. 查询用户 + 角色 + 权限
    const user = await this.prisma.user.findUnique({
      where: { email }, //在 user 表里找一个唯一用户
      include: {
        //UserRole
        roles: {
          include: {
            // Role
            role: {
              include: {
                // RolePermission
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!user || user.isDeleted) throw new UnauthorizedException('账号或密码错误')

    // 2. 校验密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) throw new UnauthorizedException('账号或密码错误')
    // 3. 提取角色 & 权限
    const roles = user.roles.map((ur) => ur.role.name)
    const permissions = user.roles.flatMap((ur) => {
      return ur.role.permissions.map((rp) => rp.permission.code)
    })
    // 4. 生成Token
    const token = this.jwtService.sign({
      userId: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions,
      isAdmin: true,
    })

    return { token }
  }
  async userInfo(token: string) {
    const { userId } = this.jwtService.verify(token)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        //UserRole
        roles: {
          include: {
            // Role
            role: {
              include: {
                // RolePermission
                permissions: {
                  include: {
                    permission: {
                      include: {
                        menuButtons: {
                          include: {
                            menu: true,
                          },
                        },
                      },
                    },
                  },
                },
                menus: {
                  include: {
                    menu: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!user || user.isDeleted) throw new UnauthorizedException('账号或密码错误')
    console.log(JSON.stringify(user, null, 2))
    // console.log(user)
    return {
      userInfo: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      permissions: buildPermissions(user),
      menus: buildMenus(user),
    }
  }
}
