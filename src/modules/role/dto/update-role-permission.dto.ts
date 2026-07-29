import { ApiProperty } from '@nestjs/swagger'
import { ArrayUnique, IsArray, IsString } from 'class-validator'

export class UpdateRolePermissionDto {
  @ApiProperty({ description: '角色ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '菜单 ID 列表', type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  menuIds: string[]

  @ApiProperty({ description: '按钮权限 ID 列表', type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionIds: string[]
}
