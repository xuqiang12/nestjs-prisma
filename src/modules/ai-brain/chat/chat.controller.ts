/**
 * 聊天控制器 - 处理对话相关 HTTP 请求
 * 提供流式对话等接口
 */
import { Body, Controller, Post } from '@nestjs/common'
import { ChatService } from './chat.service'
import { Public } from 'src/common/decorators/public.decorator'

@Controller('ai-brain/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Public()
  @Post('stream')
  async stream(@Body() body: { message: string }) {
    console.log(1111)
    try {
      const result = await this.chat.workflowChat(body.message)
      return result
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
