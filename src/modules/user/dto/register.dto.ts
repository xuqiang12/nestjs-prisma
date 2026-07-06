import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '用户名' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @ApiProperty({ description: '邮箱' })
  @IsEmail({ message: '邮箱格式错误' })
  email: string;

  @ApiProperty({ description: '手机号' })
  @IsPhoneNumber('CN', { message: '手机号格式错误' })
  phone: string;

  @ApiPropertyOptional({ description: '角色标识' })
  @IsOptional()
  role: string;

  @ApiPropertyOptional({ description: '头像地址' })
  @IsOptional()
  avatar: string;
}
// {
//   "username": "小徐",
//   "password": "xq19980212521",
//   "email": "208418289@qq.com",
//   "phone": "18567526786",
//   "role": "admin",
//   "avatar": "https://example.com/avatar.jpg"
// }
