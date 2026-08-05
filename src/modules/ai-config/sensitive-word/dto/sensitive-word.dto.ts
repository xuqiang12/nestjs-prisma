import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export const SENSITIVE_WORD_ACTIONS = ['block', 'replace', 'record'] as const
export const SENSITIVE_WORD_SCOPES = ['input', 'output', 'both'] as const

export class CreateSensitiveWordDto {
  @ApiProperty({ description: '敏感词' })
  @IsString()
  word: string

  @ApiProperty({ description: '分类' })
  @IsString()
  category: string

  @ApiProperty({ description: '处理方式', enum: SENSITIVE_WORD_ACTIONS })
  @IsIn(SENSITIVE_WORD_ACTIONS)
  action: string

  @ApiPropertyOptional({ description: '替换文本' })
  @IsString()
  @IsOptional()
  replaceWith?: string

  @ApiProperty({ description: '生效范围', enum: SENSITIVE_WORD_SCOPES })
  @IsIn(SENSITIVE_WORD_SCOPES)
  scope: string

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

export class UpdateSensitiveWordDto extends PartialType(CreateSensitiveWordDto) {
  @ApiProperty({ description: '敏感词 ID' })
  @IsString()
  id: string
}

export class SensitiveWordListDto {
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

  @ApiPropertyOptional({ description: '敏感词' })
  @IsString()
  @IsOptional()
  word?: string

  @ApiPropertyOptional({ description: '分类' })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: '生效范围', enum: SENSITIVE_WORD_SCOPES })
  @IsIn(SENSITIVE_WORD_SCOPES)
  @IsOptional()
  scope?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class SensitiveWordDetailDto {
  @ApiProperty({ description: '敏感词 ID' })
  @IsString()
  id: string
}

export class SensitiveWordStatusDto {
  @ApiProperty({ description: '敏感词 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}
