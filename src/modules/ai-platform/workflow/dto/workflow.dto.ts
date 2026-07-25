import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator'

export class CreateWorkflowDto {
  @ApiProperty({ description: '工作流编码' })
  @IsString()
  code: string

  @ApiProperty({ description: '工作流名称' })
  @IsString()
  name: string

  @ApiPropertyOptional({ description: '工作流描述' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用', default: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number

  @ApiPropertyOptional({ description: '版本号', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string
}

export class UpdateWorkflowDto extends PartialType(CreateWorkflowDto) {
  @ApiProperty({ description: '工作流 ID' })
  @IsString()
  id: string
}

export class WorkflowListDto {
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

  @ApiPropertyOptional({ description: '工作流编码' })
  @IsString()
  @IsOptional()
  code?: string

  @ApiPropertyOptional({ description: '工作流名称' })
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

export class WorkflowDetailDto {
  @ApiProperty({ description: '工作流 ID' })
  @IsString()
  id: string
}

export class WorkflowStatusDto {
  @ApiProperty({ description: '工作流 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}

export class WorkflowNodeDto {
  @ApiProperty({ description: '节点编码' })
  @IsString()
  nodeKey: string

  @ApiProperty({ description: '节点类型' })
  @IsString()
  type: string

  @ApiProperty({ description: '节点名称' })
  @IsString()
  name: string

  @ApiProperty({ description: '节点配置' })
  @IsObject()
  config: Record<string, any>

  @ApiPropertyOptional({ description: '排序' })
  @IsInt()
  @IsOptional()
  sortNo?: number
}

export class WorkflowEdgeDto {
  @ApiProperty({ description: '起点节点编码' })
  @IsString()
  fromNodeKey: string

  @ApiProperty({ description: '终点节点编码' })
  @IsString()
  toNodeKey: string

  @ApiPropertyOptional({ description: '边条件' })
  @IsObject()
  @IsOptional()
  condition?: Record<string, any>

  @ApiPropertyOptional({ description: '排序' })
  @IsInt()
  @IsOptional()
  sortNo?: number
}

export class SaveWorkflowGraphDto {
  @ApiProperty({ description: '工作流 ID' })
  @IsString()
  workflowId: string

  @ApiProperty({ description: '节点列表', type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[]

  @ApiProperty({ description: '边列表', type: [WorkflowEdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges: WorkflowEdgeDto[]
}

export class ValidateWorkflowGraphDto {
  @ApiProperty({ description: '节点列表', type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[]

  @ApiProperty({ description: '边列表', type: [WorkflowEdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges: WorkflowEdgeDto[]
}

export class TestRunWorkflowDto {
  @ApiProperty({ description: '工作流编码' })
  @IsString()
  workflowCode: string

  @ApiProperty({ description: '测试消息' })
  @IsString()
  message: string

  @ApiPropertyOptional({ description: '允许使用的工具编码' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  toolCodes?: string[]
}
