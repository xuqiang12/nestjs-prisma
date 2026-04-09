import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from 'nestjs-prisma';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  // 注册
  async register(dto: RegisterDto) {
    const { email } = dto;
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }],
      },
    });

    if (user) {
      throw new BadRequestException('邮箱已存在');
    }
    // 密码加密
    // 2. 密码加密（核心）
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
    dto.password = hashedPassword;
    const { role, ...rest } = dto;
    const newUser = await this.prisma.user.create({
      data: rest,
    });
    return '注册成功';
  }
}
