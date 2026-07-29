import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import * as bcrypt from 'bcryptjs'
import { formatPage } from 'src/common/utils/pagination'
import { RegisterDto } from './dto/register.dto'
import { UserListDto } from './dto/user-list.dto'
import { CreateAdminUserDto } from './dto/create-admin-user.dto'
import { UpdateAdminUserDto } from './dto/update-admin-user.dto'

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // 用户列表
  async getUserList(query: UserListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const includeDeleted = query.includeDeleted === 'true'

    const where = {
      isDeleted: includeDeleted ? undefined : false,
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
        isDeleted: item.isDeleted,
        deletedAt: item.deletedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        roleNames,
        roleNamesText: roleNames.join('、'),
      }
    })

    return formatPage(data, total, pageNum, pageSize)
  }

  // 用户详情
  async getUserDetail(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, isDeleted: false },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    const roleIds = user.roles.map((userRole) => userRole.roleId)
    const roleNames = user.roles.map((userRole) => userRole.role.name)

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin,
      isDeleted: user.isDeleted,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleIds,
      roleNames,
      roleNamesText: roleNames.join('、'),
    }
  }

  // 后台新增用户
  async createAdminUser(dto: CreateAdminUserDto) {
    await this.checkUserUnique(dto)

    const { roleIds, password, ...rest } = dto
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          ...rest,
          password: hashedPassword,
        },
      })

      if (roleIds?.length) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: createdUser.id, roleId })),
          skipDuplicates: true,
        })
      }

      return createdUser
    })

    return user ? '用户新增成功' : '用户新增失败'
  }

  // 后台修改用户
  async updateAdminUser(id: string, dto: UpdateAdminUserDto) {
    await this.findActiveUserOrThrow(id)
    await this.checkUserUnique(dto, id)

    const { roleIds, password, ...rest } = dto
    const data: Record<string, any> = { ...rest }

    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) {
        await tx.user.update({
          where: { id },
          data,
        })
      }

      if (roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } })
        if (roleIds.length) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: id, roleId })),
            skipDuplicates: true,
          })
        }
      }
    })

    return '用户修改成功'
  }

  // 后台删除用户：软删除，不物理删除数据
  async deleteAdminUser(id: string) {
    await this.findActiveUserOrThrow(id)
    await this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })
    return '用户删除成功'
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

  private async findActiveUserOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    if (!user || user.isDeleted) {
      throw new NotFoundException('用户不存在')
    }

    return user
  }

  private async checkUserUnique(dto: Partial<CreateAdminUserDto | UpdateAdminUserDto>, ignoreId?: string) {
    const OR = [
      dto.username ? { username: dto.username } : undefined,
      dto.email ? { email: dto.email } : undefined,
      dto.phone ? { phone: dto.phone } : undefined,
    ].filter(Boolean)

    if (!OR.length) return

    const user = await this.prisma.user.findFirst({
      where: {
        OR,
        id: ignoreId ? { not: ignoreId } : undefined,
      },
    })

    if (user) {
      throw new BadRequestException('用户名、邮箱或手机号已存在')
    }
  }
}
