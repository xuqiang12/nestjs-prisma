import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Min } from 'class-validator'

export class DeleteRoleDto {
  @ApiProperty({ description: '角色ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number
}
