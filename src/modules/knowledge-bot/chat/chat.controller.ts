import { Controller, Post, Body } from '@nestjs/common'
import { ChatService } from './chat.service'
import { Public } from '../../../common/decorators/public.decorator'

@Controller('knowledge-bot/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post()
  async chat(@Body() body: { message: string; userId?: string }) {
    return this.chatService.chat(body.message, body.userId)
  }
}
