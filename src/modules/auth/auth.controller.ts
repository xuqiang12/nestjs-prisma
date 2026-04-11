import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Headers } from '@nestjs/common';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('/userInfo')
  userInfo(@Headers('authorization') auth: string) {
    const token = auth.replace('Bearer ', '');
    return this.authService.userInfo(token);
  }
  // 公开接口（不用登录）
  //   @Public()
  // @Get('test')
  // test() {
  //   return '公开接口';
  // }

  // 必须登录
  //   @Get('user/info')
  // getInfo() {
  //   return '登录即可访问';
  // }

  // . 必须拥有 ADMIN 角色
  // @Roles('ADMIN')
  // @Get('admin')
  // admin() {
  //   return '管理员可见';
  // }

  // 必须拥有 user:list 权限
  //   @Permissions('user:list')
  // @Get('users')
  // getUserList() {
  //   return '用户列表';
  // }
}
