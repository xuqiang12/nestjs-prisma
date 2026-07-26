import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { CHAT_MODES, ChatMode } from '../../chat/dto/chat.dto'

export class ConversationListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNum?: number

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number

  @ApiPropertyOptional({ description: '会话模式：chat 普通聊天，knowledge 知识库问答', enum: CHAT_MODES })
  @IsIn(CHAT_MODES)
  @IsOptional()
  mode?: ChatMode

  @ApiPropertyOptional({ description: '运行方案编码' })
  @IsString()
  @IsOptional()
  agentCode?: string
}

export class CreateConversationDto {
  @ApiPropertyOptional({ description: '会话模式：chat 普通聊天，knowledge 知识库问答', enum: CHAT_MODES })
  @IsIn(CHAT_MODES)
  @IsOptional()
  mode?: ChatMode

  @ApiPropertyOptional({ description: '会话标题' })
  @IsString()
  @IsOptional()
  title?: string

  @ApiPropertyOptional({ description: '运行方案编码' })
  @IsString()
  @IsOptional()
  agentCode?: string
}

export class ConversationDetailDto {
  @ApiProperty({ description: '会话 ID' })
  @IsString()
  id: string
}

export class RenameConversationDto extends ConversationDetailDto {
  @ApiProperty({ description: '会话 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '会话标题' })
  @IsString()
  title: string
}

export class DeleteConversationDto {
  @ApiProperty({ description: '会话 ID' })
  @IsString()
  id: string
}
