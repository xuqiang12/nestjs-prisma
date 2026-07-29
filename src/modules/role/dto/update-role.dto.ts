import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateRoleDto {
  @ApiProperty({ description: '角色ID' })
  @IsString()
  id: string

  @ApiPropertyOptional({ description: '角色名称' })
  @IsString()
  @IsOptional()
  name?: string
}
