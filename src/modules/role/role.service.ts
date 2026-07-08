import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { CreateRoleDto } from './dto/create-role.dto'
import { DeleteRoleDto } from './dto/delete-role.dto'
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto'
import { UpdateRoleDto } from './dto/update-role.dto'

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoleList() {
    const list = await this.prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { id: 'asc' },
    })

    return list.map((item) => ({
      id: item.id,
      name: item.name,
      userCount: item._count.users,
    }))
  }

  async getRoleDetail(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        menus: { select: { menuId: true } },
        permissions: { select: { permissionId: true } },
      },
    })

    if (!role) {
      throw new NotFoundException('角色不存在')
    }

    return {
      id: role.id,
      name: role.name,
      menuIds: role.menus.map((item) => item.menuId),
      permissionIds: role.permissions.map((item) => item.permissionId),
    }
  }

  async createRole(dto: CreateRoleDto) {
    await this.prisma.role.create({
      data: { name: dto.name },
    })

    return '角色新增成功'
  }

  async updateRole(dto: UpdateRoleDto) {
    await this.findRoleOrThrow(dto.id)

    if (!dto.name) {
      throw new BadRequestException('角色名称不能为空')
    }

    await this.prisma.role.update({
      where: { id: dto.id },
      data: { name: dto.name },
    })

    return '角色修改成功'
  }

  async deleteRole(dto: DeleteRoleDto) {
    await this.findRoleOrThrow(dto.id)

    const userCount = await this.prisma.userRole.count({
      where: { roleId: dto.id },
    })

    if (userCount > 0) {
      throw new BadRequestException('角色已被用户使用，不能删除')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.menuRole.deleteMany({ where: { roleId: dto.id } })
      await tx.rolePermission.deleteMany({ where: { roleId: dto.id } })
      await tx.role.delete({ where: { id: dto.id } })
    })

    return '角色删除成功'
  }

  async updateRolePermission(dto: UpdateRolePermissionDto) {
    await this.findRoleOrThrow(dto.id)

    await this.prisma.$transaction(async (tx) => {
      await tx.menuRole.deleteMany({ where: { roleId: dto.id } })
      await tx.rolePermission.deleteMany({ where: { roleId: dto.id } })

      if (dto.menuIds.length) {
        await tx.menuRole.createMany({
          data: dto.menuIds.map((menuId) => ({ roleId: dto.id, menuId })),
          skipDuplicates: true,
        })
      }

      if (dto.permissionIds.length) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: dto.id, permissionId })),
          skipDuplicates: true,
        })
      }
    })

    return '角色授权保存成功'
  }

  private async findRoleOrThrow(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    })

    if (!role) {
      throw new NotFoundException('角色不存在')
    }

    return role
  }
}
