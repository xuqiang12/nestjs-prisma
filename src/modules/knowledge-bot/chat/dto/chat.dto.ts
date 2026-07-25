import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString } from 'class-validator'

export type ChatMode = 'chat' | 'knowledge'

export const CHAT_MODES: ChatMode[] = ['chat', 'knowledge']

export class ChatRequestDto {
  @ApiProperty({ description: '用户消息' })
  @IsString()
  message: string

  @ApiPropertyOptional({ description: '会话 ID；不传时自动创建新会话' })
  @IsString()
  @IsOptional()
  conversationId?: string

  @ApiPropertyOptional({ description: '会话模式：chat 普通聊天，knowledge 知识库问答', enum: CHAT_MODES })
  @IsIn(CHAT_MODES)
  @IsOptional()
  mode?: ChatMode

  @ApiPropertyOptional({ description: '智能体编码；不传时保持默认对话行为' })
  @IsString()
  @IsOptional()
  agentCode?: string

  @ApiPropertyOptional({ description: '用户 ID；不传时不读取或写入短期记忆' })
  @IsString()
  @IsOptional()
  userId?: string
}

export class ChatStreamRequestDto extends ChatRequestDto {}
