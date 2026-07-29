import { IsInt, IsOptional, IsString } from 'class-validator'
import { ApiProperty, PartialType } from '@nestjs/swagger'
export enum MenuType {
  DIRECTORY = 'DIRECTORY',
  PAGE = 'PAGE',
}

export class CreateDto {
  @ApiProperty({ description: '父菜单ID，0=顶级', default: null })
  @IsString()
  @IsOptional()
  parentId?: string

  @ApiProperty({ description: '菜单名称' })
  @IsString()
  name: string

  @ApiProperty({ description: '路由路径', required: false })
  @IsString()
  @IsOptional()
  path?: string

  @ApiProperty({ description: '前端组件路径', required: false })
  @IsString()
  @IsOptional()
  component?: string

  @ApiProperty({ description: '菜单图标', required: false })
  @IsString()
  @IsOptional()
  icon?: string

  @ApiProperty({ description: '排序', default: 0 })
  @IsInt()
  @IsOptional()
  sort?: number

  @ApiProperty({ description: '类型 DIRECTORY=菜单 PAGE=页面', default: MenuType.PAGE })
  @IsString()
  type: MenuType
}
export class UpdateDto extends PartialType(CreateDto) {
  @ApiProperty({ description: 'ID 必填' })
  @IsString()
  id: string // 修改必须传 id
}

export class DeleteDto {
  @ApiProperty({ description: 'ID 必填' })
  @IsString()
  id: string // 删除必须传 id
}
