import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateSkillPackageDto {
  @ApiProperty({ description: '技能包编码' })
  @IsString()
  code: string

  @ApiProperty({ description: '技能包名称' })
  @IsString()
  name: string

  @ApiPropertyOptional({ description: '技能包描述' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: '提示词编码列表' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  promptCodes?: string[]

  @ApiPropertyOptional({ description: '工具编码列表' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  toolCodes?: string[]

  @ApiPropertyOptional({ description: '工作流编码' })
  @IsString()
  @IsOptional()
  workflowCode?: string

  @ApiPropertyOptional({ description: '智能体默认配置' })
  @IsObject()
  @IsOptional()
  agentDefaults?: Record<string, any>

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

export class UpdateSkillPackageDto extends PartialType(CreateSkillPackageDto) {
  @ApiProperty({ description: '技能包 ID' })
  @IsString()
  id: string
}

export class SkillPackageListDto {
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

  @ApiPropertyOptional({ description: '技能包编码' })
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional({ description: '技能包名称' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class SkillPackageDetailDto {
  @ApiProperty({ description: '技能包 ID' })
  @IsString()
  id: string
}

export class SkillPackageStatusDto {
  @ApiProperty({ description: '技能包 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}

export class InstallSkillPackageDto {
  @ApiProperty({ description: '技能包 ID' })
  @IsString()
  packageId: string

  @ApiProperty({ description: '智能体 ID' })
  @IsString()
  agentId: string
}
