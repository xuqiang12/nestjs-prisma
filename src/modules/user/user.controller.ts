import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UserService } from './user.service'
import { RegisterDto } from './dto/register.dto'
import { UserListDto } from './dto/user-list.dto'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { CreateAdminUserDto } from './dto/create-admin-user.dto'
import { UpdateAdminUserDto } from './dto/update-admin-user.dto'

@ApiTags('用户模块')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 用户列表
  @ApiOperation({ summary: '查询用户列表' })
  @Permissions('system:user:list')
  @Get('list')
  getUserList(@Query() query: UserListDto) {
    return this.userService.getUserList(query)
  }

  // 用户详情
  @ApiOperation({ summary: '查询用户详情' })
  @Permissions('system:user:detail')
  @Get(':id')
  getUserDetail(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserDetail(id)
  }

  // 后台新增用户
  @ApiOperation({ summary: '后台新增用户' })
  @Permissions('system:user:add')
  @Post()
  createAdminUser(@Body() dto: CreateAdminUserDto) {
    return this.userService.createAdminUser(dto)
  }

  // 后台修改用户
  @ApiOperation({ summary: '后台修改用户' })
  @Permissions('system:user:edit')
  @Patch(':id')
  updateAdminUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminUserDto) {
    return this.userService.updateAdminUser(id, dto)
  }

  // 后台删除用户
  @ApiOperation({ summary: '后台删除用户' })
  @Permissions('system:user:delete')
  @Delete(':id')
  deleteAdminUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteAdminUser(id)
  }

  // 注册
  @ApiOperation({ summary: '注册用户' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.userService.register(dto)
  }
}
