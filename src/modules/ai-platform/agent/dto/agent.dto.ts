import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { CHAT_MODES } from '../../../knowledge-bot/chat/dto/chat.dto'

export class CreateAgentDto {
  @ApiPropertyOptional({ description: '智能体编码，新增时由系统自动生成' })
  @IsString()
  @IsOptional()
  code?: string

  @ApiProperty({ description: '智能体名称' })
  @IsString()
  name: string

  @ApiPropertyOptional({ description: '智能体描述' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: '智能体头像地址' })
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiPropertyOptional({ description: '欢迎语' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string

  @ApiPropertyOptional({ description: '默认推荐问题' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recommendedQuestions?: string[]

  @ApiPropertyOptional({ description: '智能体标签' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]

  @ApiProperty({ description: '绑定提示词ID' })
  @IsString()
  promptId: string

  @ApiPropertyOptional({ description: '是否随提示词模板变化', default: true })
  @IsBoolean()
  @IsOptional()
  promptSyncEnabled?: boolean

  @ApiPropertyOptional({ description: '提示词模板快照' })
  @IsString()
  @IsOptional()
  promptSnapshot?: string

  @ApiPropertyOptional({ description: '智能体补充提示词' })
  @IsString()
  @IsOptional()
  promptEnhancement?: string

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

  @ApiPropertyOptional({ description: '是否仅依据知识库回答', default: false })
  @IsBoolean()
  @IsOptional()
  knowledgeStrict?: boolean

  @ApiPropertyOptional({ description: '知识库标签范围' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  knowledgeTags?: string[]

  @ApiPropertyOptional({ description: '绑定知识库ID列表' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  knowledgeBaseIds?: string[]

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
