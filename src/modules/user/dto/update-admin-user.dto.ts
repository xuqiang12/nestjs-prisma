import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
} from 'class-validator'

export class UpdateAdminUserDto {
  @ApiPropertyOptional({ description: '用户名' })
  @IsString()
  @IsOptional()
  username?: string

  @ApiPropertyOptional({ description: '密码' })
  @IsString()
  @IsOptional()
  password?: string

  @ApiPropertyOptional({ description: '邮箱' })
  @IsEmail({}, { message: '邮箱格式错误' })
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ description: '手机号' })
  @IsPhoneNumber('CN', { message: '手机号格式错误' })
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ description: '头像地址' })
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiPropertyOptional({ description: '是否超级管理员' })
  @IsBoolean()
  @IsOptional()
  isSuperAdmin?: boolean

  @ApiPropertyOptional({ description: '角色 ID 列表', type: [Number] })
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  roleIds?: number[]
}
