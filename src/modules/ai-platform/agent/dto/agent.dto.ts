import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { CHAT_MODES } from '../../../knowledge-bot/chat/dto/chat.dto'

export class CreateAgentDto {
  @ApiProperty({ description: '智能体编码' })
  @IsString()
  code: string

  @ApiProperty({ description: '智能体名称' })
  @IsString()
  name: string

  @ApiPropertyOptional({ description: '智能体描述' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ description: '绑定提示词ID' })
  @IsString()
  promptId: string

  @ApiPropertyOptional({ description: '默认模式', enum: CHAT_MODES, default: 'chat' })
  @IsIn(CHAT_MODES)
  @IsOptional()
  mode?: string

  @ApiPropertyOptional({ description: '模型名称' })
  @IsString()
  @IsOptional()
  model?: string

  @ApiPropertyOptional({ description: 'temperature' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number

  @ApiPropertyOptional({ description: 'top_p' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  topP?: number

  @ApiPropertyOptional({ description: '是否启用知识库', default: false })
  @IsBoolean()
  @IsOptional()
  knowledgeEnabled?: boolean

  @ApiPropertyOptional({ description: '允许使用的工具编码' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  toolCodes?: string[]

  @ApiPropertyOptional({ description: '绑定工作流编码' })
  @IsString()
  @IsOptional()
  workflowCode?: string

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

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @ApiProperty({ description: '智能体 ID' })
  @IsString()
  id: string
}

export class AgentListDto {
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
  code?: string

  @ApiPropertyOptional({ description: '智能体名称' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: '默认模式', enum: CHAT_MODES })
  @IsIn(CHAT_MODES)
  @IsOptional()
  mode?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class AgentDetailDto {
  @ApiProperty({ description: '智能体 ID' })
  @IsString()
  id: string
}

export class AgentStatusDto {
  @ApiProperty({ description: '智能体 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 停用' })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}
