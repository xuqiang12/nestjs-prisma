import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class UserListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNum?: number

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number

  @ApiPropertyOptional({ description: '用户名', required: false })
  @IsString()
  @IsOptional()
  username?: string

  @ApiPropertyOptional({ description: '邮箱', required: false })
  @IsString()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ description: '手机号', required: false })
  @IsString()
  @IsOptional()
  phone?: string
}
