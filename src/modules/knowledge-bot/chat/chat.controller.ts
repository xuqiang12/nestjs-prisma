import { Controller, Post, Body, Res, Req } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request, Response } from 'express'
import { ChatService } from './chat.service'
import { ChatRequestDto, ChatStreamRequestDto } from './dto/chat.dto'
import { Permissions } from '../../../common/decorators/permissions.decorator'

type AuthenticatedRequest = Request & {
  user: {
    userId: number
  }
}

@ApiTags('知识库模块')
@Controller('knowledge-bot/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: '知识库对话' })
  @ApiBody({ type: ChatRequestDto })
  @Permissions('ai:chat:send')
  @Post()
  async chat(@Body() body: ChatRequestDto, @Req() req: AuthenticatedRequest) {
    console.log('1、调用接口，请求参数:', body)
    return this.chatService.chat(body, req.user.userId)
  }

  @ApiOperation({ summary: '知识库流式对话' })
  @ApiBody({ type: ChatStreamRequestDto })
  @Permissions('ai:chat:send')
  @Post('stream')
  async stream(@Body() body: ChatStreamRequestDto, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    for await (const event of this.chatService.stream(body, req.user.userId)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  }
}
