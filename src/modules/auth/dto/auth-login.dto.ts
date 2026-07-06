import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class LoginDto {
  @ApiProperty({ description: '登录邮箱' })
  @IsEmail({ message: '请输入正确的邮箱格式' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string
  @ApiProperty({ description: '登录密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string
}
