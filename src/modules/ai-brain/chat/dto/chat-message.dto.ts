import { IsString, IsNotEmpty } from 'class-validator'

/**
 * 聊天消息请求 DTO
 */
export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string
}
