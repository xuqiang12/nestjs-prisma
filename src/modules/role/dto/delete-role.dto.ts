import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class DeleteRoleDto {
  @ApiProperty({ description: '角色ID' })
  @IsString()
  id: string
}
