import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator'

export class ModelConfigListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNum?: number

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number

  @ApiPropertyOptional({ description: '供应商ID' })
  @IsString()
  @IsOptional()
  providerId?: string

  @ApiPropertyOptional({ description: '模型名称' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: '模型类型' })
  @IsString()
  @IsOptional()
  modelType?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class CreateModelConfigDto {
  @ApiProperty({ description: '供应商ID' })
  @IsString()
  providerId: string

  @ApiProperty({ description: '模型名称' })
  @IsString()
  name: string

  @ApiProperty({ description: '模型编码' })
  @IsString()
  code: string

  @ApiProperty({ description: '模型标识' })
  @IsString()
  modelName: string

  @ApiPropertyOptional({ description: '模型类型', default: 'chat' })
  @IsString()
  @IsOptional()
  modelType?: string

  @ApiPropertyOptional({ description: '模型能力' })
  @IsObject()
  @IsOptional()
  capabilities?: Record<string, unknown>

  @ApiPropertyOptional({ description: '是否默认模型', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用', default: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string
}

export class UpdateModelConfigDto extends PartialType(CreateModelConfigDto) {
  @ApiProperty({ description: '模型配置ID' })
  @IsString()
  id: string
}

export class ModelConfigStatusDto {
  @ApiProperty({ description: '模型配置ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}
