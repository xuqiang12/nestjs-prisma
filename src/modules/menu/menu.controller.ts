import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/menu.dto';
import { CreateBtbDto } from './dto/button.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) { }
  @Public()
  @Post("create")
  createMenu(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.createMenu(createMenuDto);
  }
  @Public()
  @Get("list")
  getMenuList() {
    return this.menuService.getMenuList();
  }

  // 新增按钮
  @Public()
  @Post("button/create")
  createButton(@Body() createButtonDto: CreateBtbDto) {
    return this.menuService.createButton(createButtonDto);
  }
}
