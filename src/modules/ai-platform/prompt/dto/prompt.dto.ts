import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreatePromptDto {
  @ApiProperty({ description: '提示词名称' })
  @IsString()
  name: string

  @ApiProperty({ description: '使用场景' })
  @IsString()
  scene: string

  @ApiProperty({ description: '提示词内容' })
  @IsString()
  content: string

  @ApiPropertyOptional({ description: '版本号', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number

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

export class UpdatePromptDto extends PartialType(CreatePromptDto) {
  @ApiProperty({ description: '提示词 ID' })
  @IsString()
  id: string
}

export class PromptListDto {
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

  @ApiPropertyOptional({ description: '提示词编码' })
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional({ description: '提示词名称' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: '使用场景' })
  @IsString()
  @IsOptional()
  scene?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class PromptDetailDto {
  @ApiProperty({ description: '提示词 ID' })
  @IsString()
  id: string
}

export class PromptStatusDto {
  @ApiProperty({ description: '提示词 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}
