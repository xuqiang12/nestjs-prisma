import { Controller, Post, Body } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ChatService } from './chat.service'
import { Public } from '../../../common/decorators/public.decorator'

@ApiTags('知识库模块')
@Controller('knowledge-bot/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @ApiOperation({ summary: '知识库对话' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', description: '用户消息' },
        userId: { type: 'string', description: '用户 ID' },
      },
    },
  })
  @Post()
  async chat(@Body() body: { message: string; userId?: string }) {
    console.log('1、调用接口，请求参数:', body)
    return this.chatService.chat(body.message, body.userId)
  }
}
