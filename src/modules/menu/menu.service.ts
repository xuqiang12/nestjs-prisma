import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreateDto, DeleteDto, UpdateDto } from './dto/menu.dto'
import { ButtonListDto, CreateButtonDto, DeleteButtonDto, UpdateButtonDto } from './dto/button.dto'
import { PrismaService } from 'nestjs-prisma'

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}
  // 新增菜单
  async createMenu(menu: CreateDto) {
    await this.prisma.menu.create({
      data: menu,
    })
    return '菜单新增成功'
  }
  // 获取菜单列表
  async getMenuList() {
    return await this.prisma.menu.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    })
  }

  // 获取按钮列表
  async getButtonList(dto: ButtonListDto) {
    const list = await this.prisma.menuButton.findMany({
      where: { menuId: dto.menuId },
      include: {
        permission: {
          select: { code: true },
        },
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    })
    return list.map((item) => ({
      id: item.id,
      menuId: item.menuId,
      name: item.name,
      sort: item.sort,
      permissionId: item.permissionId,
      permissionCode: item.permission.code,
    }))
  }

  // 新增按钮
  async createButton(dto: CreateButtonDto) {
    const { menuId, permissionCode, name, sort } = dto
    const permission = await this.findOrCreatePermission(permissionCode, name)
    const exist = await this.prisma.menuButton.findFirst({
      where: { permissionId: permission.id },
    })
    if (exist) {
      throw new BadRequestException('权限标识已被其他按钮使用')
    }
    await this.prisma.menuButton.create({
      data: {
        menuId,
        name,
        sort,
        permissionId: permission.id,
      },
    })
    return '按钮新增成功'
  }
  // 修改按钮
  async updateButton(dto: UpdateButtonDto) {
    const button = await this.prisma.menuButton.findUnique({
      where: { id: dto.id },
    })
    if (!button) {
      throw new NotFoundException('按钮不存在')
    }

    const permission = await this.findOrCreatePermission(dto.permissionCode, dto.name)
    const exist = await this.prisma.menuButton.findFirst({
      where: {
        permissionId: permission.id,
        NOT: { id: dto.id },
      },
    })
    if (exist) {
      throw new BadRequestException('权限标识已被其他按钮使用')
    }

    await this.prisma.menuButton.update({
      where: { id: dto.id },
      data: {
        menuId: dto.menuId,
        name: dto.name,
        sort: dto.sort,
        permissionId: permission.id,
      },
    })
    return '按钮修改成功'
  }
  // 删除按钮
  async deleteButton(dto: DeleteButtonDto) {
    const button = await this.prisma.menuButton.findUnique({
      where: { id: dto.id },
    })
    if (!button) {
      throw new NotFoundException('按钮不存在')
    }

    await this.prisma.rolePermission.deleteMany({
      where: { permissionId: button.permissionId },
    })
    await this.prisma.menuButton.delete({
      where: { id: dto.id },
    })
    return '按钮删除成功'
  }
  // 修改菜单
  async updateMenu(menu: UpdateDto) {
    const { id, ...data } = menu
    await this.prisma.menu.update({
      where: { id },
      data,
    })
    return '菜单修改成功'
  }
  // 删除菜单
  async deleteMenu(menu: DeleteDto) {
    const childCount = await this.prisma.menu.count({
      where: { parentId: menu.id },
    })
    if (childCount > 0) {
      throw new BadRequestException('菜单下存在子菜单，不能删除')
    }

    const [roleCount, buttonCount] = await Promise.all([
      this.prisma.menuRole.count({ where: { menuId: menu.id } }),
      this.prisma.menuButton.count({ where: { menuId: menu.id } }),
    ])
    if (roleCount > 0 || buttonCount > 0) {
      throw new BadRequestException('菜单存在授权关系，不能删除')
    }

    await this.prisma.menu.delete({
      where: { id: menu.id },
    })
    return '菜单删除成功'
  }
  // 获取菜单树
  async getMenuTree() {
    const list = await this.getMenuList()
    const buttons = await this.prisma.menuButton.findMany({
      include: {
        permission: {
          select: { code: true },
        },
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    })
    const buttonMap = buttons.reduce((map, item) => {
      const button = {
        id: item.id,
        menuId: item.menuId,
        name: item.name,
        sort: item.sort,
        permissionId: item.permissionId,
        permissionCode: item.permission.code,
      }
      map[item.menuId] = map[item.menuId] || []
      map[item.menuId].push(button)
      return map
    }, {})
    function buildMenuTree(list, parentId = null) {
      return list
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          buttons: buttonMap[item.id] || [],
          children: buildMenuTree(list, item.id),
        }))
    }
    const tree = buildMenuTree(list)
    return tree
  }

  private async findOrCreatePermission(permissionCode: string, name?: string) {
    let permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    })
    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { code: permissionCode, name },
      })
    }
    return permission
  }
}
