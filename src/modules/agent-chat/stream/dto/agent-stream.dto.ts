// 定义新版智能体流式对话入口的请求参数。
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class AgentStreamRequestDto {
  @ApiProperty({ description: '智能体编码；v2 流式对话必须依附智能体运行' })
  agentCode: string

  @ApiProperty({ description: '用户消息' })
  @IsString()
  message: string

  @ApiPropertyOptional({ description: '会话 ID；不传时后续会话闭环步骤自动创建' })
  @IsString()
  @IsOptional()
  conversationId?: string
}
