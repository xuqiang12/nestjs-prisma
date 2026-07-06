import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UserService } from './user.service'
import { RegisterDto } from './dto/register.dto'
import { UserListDto } from './dto/user-list.dto'

@ApiTags('用户模块')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 用户列表
  @ApiOperation({ summary: '查询用户列表' })
  @Get('list')
  getUserList(@Query() query: UserListDto) {
    return this.userService.getUserList(query)
  }

  // 注册
  @ApiOperation({ summary: '注册用户' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.userService.register(dto)
  }
}
