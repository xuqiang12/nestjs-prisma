import { ApiProperty } from '@nestjs/swagger'

export class CreateChatDto {
  @ApiProperty({ description: '聊天消息' })
  message: string
}
