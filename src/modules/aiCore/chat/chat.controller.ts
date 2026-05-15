import { Body, Controller, Post, Res } from '@nestjs/common'
import { Public } from '../../../common/decorators/public.decorator'
import { ChatService } from './chat.service'

@Controller('aiCore/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}
  @Public()
  @Post('stream')
  async stream(@Body() body: { message: string }, @Res() res) {
    const result = await this.chat.createKnowledge(body.message, {
      source: 'test',
    })
  }
}
