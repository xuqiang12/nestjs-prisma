// 定义 V2 普通聊天请求参数。
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class ChatRequestDto {
  @ApiProperty({ description: '用户输入的普通聊天内容' })
  @IsString()
  message: string

  @ApiPropertyOptional({ description: '继续对话时传入的会话 ID' })
  @IsString()
  @IsOptional()
  conversationId?: string
}
