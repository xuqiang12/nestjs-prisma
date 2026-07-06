import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { MenuService } from './menu.service'
import { CreateDto, UpdateDto } from './dto/menu.dto'
import { CreateBtbDto } from './dto/button.dto'

@ApiTags('菜单模块')
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // 获取菜单列表
  @ApiOperation({ summary: '获取菜单列表' })
  @Get('list')
  getMenuList() {
    return this.menuService.getMenuList()
  }
  // 新增菜单
  @ApiOperation({ summary: '新增菜单' })
  @Post('create')
  createMenu(@Body() createMenuDto: CreateDto) {
    return this.menuService.createMenu(createMenuDto)
  }
  // 修改菜单
  @ApiOperation({ summary: '修改菜单' })
  @Patch('update')
  updateMenu(@Body() menu: UpdateDto) {
    return this.menuService.updateMenu(menu)
  }
  // 删除菜单
  @ApiOperation({ summary: '删除菜单' })
  @Delete('delete')
  deleteMenu(@Body() menu: any) {
    return this.menuService.deleteMenu(menu)
  }
  // 获取菜单树
  @ApiOperation({ summary: '获取菜单树' })
  @Get('tree')
  getMenuTree() {
    return this.menuService.getMenuTree()
  }
  // 获取按钮列表
  // @Get('button/list')
  // getButtonList() {
  //   return this.menuService.getButtonList()
  // }
  // 新增按钮
  @ApiOperation({ summary: '新增菜单按钮' })
  @Post('button/create')
  createButton(@Body() createButtonDto: CreateBtbDto) {
    return this.menuService.createButton(createButtonDto)
  }
  // // 修改按钮
  // @Patch('button/update')
  // updateButton(@Body() button: any) {
  //   return this.menuService.updateButton(button)
  // }
  // // 删除按钮
  // @Delete('button/delete')
  // deleteButton(@Body() button: any) {
  //   return this.menuService.deleteButton(button)
  // }
}
