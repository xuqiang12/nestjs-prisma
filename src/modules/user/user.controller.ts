import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  // 注册
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.userService.register(dto);
  }
}
