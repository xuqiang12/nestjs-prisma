import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBtbDto {
  @ApiProperty({ description: '所属菜单ID' })
  @IsInt()
  menuId: number;

  @ApiProperty({ description: '权限标识，如 system:user:add' })
  @IsString()
  permissionCode: string;

  @ApiProperty({ description: '按钮名称：新增/编辑/删除', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '排序', required: false, default: 0 })
  @IsInt()
  @IsOptional()
  sort?: number;
}