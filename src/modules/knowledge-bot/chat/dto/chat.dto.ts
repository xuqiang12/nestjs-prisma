import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class ChatRequestDto {
  @ApiProperty({ description: '用户消息' })
  @IsString()
  message: string

  @ApiPropertyOptional({ description: '用户 ID；不传时不读取或写入短期记忆' })
  @IsString()
  @IsOptional()
  userId?: string
}

export class ChatStreamRequestDto extends ChatRequestDto {}
