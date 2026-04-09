import { Injectable } from '@nestjs/common';
import { CreateMenuDto } from './dto/menu.dto';
import { CreateBtbDto } from './dto/button.dto';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) { }
  async createMenu(createMenuDto: CreateMenuDto) {
    await this.prisma.menu.create(
      {
        data: createMenuDto,
      });
    return '菜单新增成功';
  }


  // 新增按钮
  async createButton(dto: CreateBtbDto) {
    const { menuId, permissionCode, name, sort } = dto;
    // 1. 查权限是否存在
    let permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode }
    });
    // 2. 不存在就创建
    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { code: permissionCode, name }
      });
    }
    // 3. 防重复
    const exist = await this.prisma.button.findUnique({
      where: {
        menuId_permissionId: { menuId, permissionId: permission.id }
      }
    });
    if (exist) {
      throw new Error('该按钮已存在');
    }
    // 4. 创建按钮
    await this.prisma.menuButton.create({
      data: {
        menuId, name, sort, permissionId: permission.id
      }
    });
    return '按钮新增成功';
  }
}
