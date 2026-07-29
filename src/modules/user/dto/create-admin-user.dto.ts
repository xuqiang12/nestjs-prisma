import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator'

export class CreateAdminUserDto {
  @ApiProperty({ description: '用户名' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string

  @ApiProperty({ description: '邮箱' })
  @IsEmail({}, { message: '邮箱格式错误' })
  email: string

  @ApiProperty({ description: '手机号' })
  @IsPhoneNumber('CN', { message: '手机号格式错误' })
  phone: string

  @ApiPropertyOptional({ description: '头像地址' })
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiPropertyOptional({ description: '是否超级管理员' })
  @IsBoolean()
  @IsOptional()
  isSuperAdmin?: boolean

  @ApiPropertyOptional({ description: '角色 ID 列表', type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[]
}
