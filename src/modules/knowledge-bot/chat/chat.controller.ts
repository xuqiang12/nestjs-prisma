import { Controller, Post, Body } from '@nestjs/common'
import { ChatService } from './chat.service'
import { Public } from '../../../common/decorators/public.decorator'

@Controller('knowledge-bot/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post()
  async chat(@Body() body: { message: string; userId?: string }) {
    console.log('1、调用接口，请求参数:', body)
    return this.chatService.chat(body.message, body.userId)
  }
}
