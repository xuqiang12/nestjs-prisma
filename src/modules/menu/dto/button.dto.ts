import { IsInt, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ButtonListDto {
  @ApiProperty({ description: '所属菜单ID' })
  @IsString()
  menuId: string
}

export class CreateButtonDto extends ButtonListDto {

  @ApiProperty({ description: '权限标识，如 system:user:add' })
  @IsString()
  permissionCode: string

  @ApiProperty({ description: '按钮名称：新增/编辑/删除', required: false })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({ description: '排序', required: false, default: 0 })
  @IsInt()
  @IsOptional()
  sort?: number
}

export class UpdateButtonDto extends CreateButtonDto {
  @ApiProperty({ description: 'ID 必填' })
  @IsString()
  id: string // 修改按钮必须传 id
}

export class DeleteButtonDto {
  @ApiProperty({ description: 'ID 必填' })
  @IsString()
  id: string // 删除按钮必须传 id
}
