import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class WorkflowRunListDto {
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

  @ApiPropertyOptional({ description: '智能体编码' })
  @IsString()
  @IsOptional()
  agentCode?: string

  @ApiPropertyOptional({ description: '工作流编码' })
  @IsString()
  @IsOptional()
  workflowCode?: string

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string
}

export class WorkflowRunDetailDto {
  @ApiProperty({ description: '运行记录 ID' })
  @IsString()
  id: string
}
