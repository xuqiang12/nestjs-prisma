import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { HOME_SCENES } from '../home.constants'

export class CreateHomeDecorationDto {
  @ApiPropertyOptional({ description: '配置 ID' })
  @IsString()
  @IsOptional()
  id?: string

  @ApiProperty({ description: '配置名称' })
  @IsString()
  name: string

  @ApiProperty({ description: '场景类型', enum: HOME_SCENES })
  @IsIn(HOME_SCENES)
  scene: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用', default: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsInt()
  @IsOptional()
  sortNo?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string
}

export class UpdateHomeDecorationDto extends PartialType(CreateHomeDecorationDto) {
  @ApiProperty({ description: '配置 ID' })
  @IsString()
  id: string
}

export class UpdateHomeDecorationStatusDto {
  @ApiProperty({ description: '配置 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}
