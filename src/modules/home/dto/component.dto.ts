import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator'
import { HOME_TEMPLATE_IDS } from '../home.constants'

export class CreateHomeComponentDto {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '所属配置 ID' })
  @IsString()
  decorationId: string

  @ApiProperty({ description: '组件类型', enum: HOME_TEMPLATE_IDS })
  @IsIn(HOME_TEMPLATE_IDS)
  templateId: string

  @ApiPropertyOptional({ description: '组件名称' })
  @IsString()
  @IsOptional()
  templateName?: string

  @ApiProperty({ description: '组件差异化 JSON 配置' })
  @IsObject()
  info: Record<string, unknown>

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsInt()
  @IsOptional()
  sortNo?: number

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用', default: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class UpdateHomeComponentDto extends PartialType(CreateHomeComponentDto) {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string
}

export class UpdateHomeComponentStatusDto {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}

export class HomeComponentSortItemDto {
  @ApiProperty({ description: '组件 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '排序' })
  @IsInt()
  sortNo: number
}

export class SortHomeComponentsDto {
  @ApiProperty({ description: '所属配置 ID' })
  @IsString()
  decorationId: string

  @ApiProperty({ type: [HomeComponentSortItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeComponentSortItemDto)
  items: HomeComponentSortItemDto[]
}
