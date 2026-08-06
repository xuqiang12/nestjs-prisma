// 暴露 V2 普通聊天 HTTP 入口。
import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { ChatRequestDto } from './dto/chat.dto'
import { ChatService } from './chat.service'

type AuthenticatedRequest = Request & {
  user: {
    userId: string
  }
}

@ApiTags('V2 普通聊天')
@Controller('chat')
export class ChatController {
  // 注入普通聊天服务，保持 Controller 只负责 HTTP 入参和用户身份传递。
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: '发送普通聊天消息' })
  @ApiBody({ type: ChatRequestDto })
  @Permissions('ai:chat:send')
  @Post()
  // 处理普通聊天请求，入口即确定为普通对话模式。
  async chat(@Body() body: ChatRequestDto, @Req() req: AuthenticatedRequest) {
    return this.chatService.chat(body, req.user.userId)
  }
}
