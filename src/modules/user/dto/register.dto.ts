import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @IsEmail({ message: '邮箱格式错误' })
  email: string;

  @IsPhoneNumber('CN', { message: '手机号格式错误' })
  phone: string;

  @IsOptional()
  role: string;

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
