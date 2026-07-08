import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayUnique, IsArray, IsInt, Min } from 'class-validator'

export class UpdateRolePermissionDto {
  @ApiProperty({ description: '角色ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number

  @ApiProperty({ description: '菜单 ID 列表', type: [Number] })
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  menuIds: number[]

  @ApiProperty({ description: '按钮权限 ID 列表', type: [Number] })
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds: number[]
}
