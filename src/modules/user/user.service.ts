import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import * as bcrypt from 'bcryptjs'
import { formatPage } from 'src/common/utils/pagination'
import { RegisterDto } from './dto/register.dto'
import { UserListDto } from './dto/user-list.dto'

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // 用户列表
  async getUserList(query: UserListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)

    const where = {
      username: query.username ? { contains: query.username, mode: 'insensitive' as const } : undefined,
      email: query.email ? { contains: query.email, mode: 'insensitive' as const } : undefined,
      phone: query.phone ? { contains: query.phone, mode: 'insensitive' as const } : undefined,
    }

    const [list, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ])

    const data = list.map((item) => {
      const roleNames = item.roles.map((userRole) => userRole.role.name)
      return {
        id: item.id,
        username: item.username,
        email: item.email,
        phone: item.phone,
        avatar: item.avatar,
        isSuperAdmin: item.isSuperAdmin,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        roleNames,
        roleNamesText: roleNames.join('、'),
      }
    })

    return formatPage(data, total, pageNum, pageSize)
  }

  // 注册
  async register(dto: RegisterDto) {
    const { email } = dto
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }],
      },
    })

    if (user) {
      throw new BadRequestException('邮箱已存在')
    }

    // 密码加密
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds)
    dto.password = hashedPassword
    const { role, ...rest } = dto
    await this.prisma.user.create({
      data: rest,
    })
    return '注册成功'
  }
}
