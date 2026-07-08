import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateRoleDto {
  @ApiProperty({ description: '角色ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number

  @ApiPropertyOptional({ description: '角色名称' })
  @IsString()
  @IsOptional()
  name?: string
}
