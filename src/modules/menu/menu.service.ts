import { Injectable } from '@nestjs/common'
import { CreateDto } from './dto/menu.dto'
import { CreateBtbDto } from './dto/button.dto'
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
    return await this.prisma.menu.findMany()
  }

  // 新增按钮
  async createButton(dto: CreateBtbDto) {
    const { menuId, permissionCode, name, sort } = dto
    // 1. 查权限是否存在
    let permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    })
    // 2. 不存在就创建
    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { code: permissionCode, name },
      })
    }
    // 3. 防重复
    const exist = await this.prisma.menuButton.findUnique({
      where: {
        menuId_permissionId: { menuId, permissionId: permission.id },
      },
    })
    if (exist) {
      throw new Error('该按钮已存在')
    }
    // 4. 创建按钮
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
}
