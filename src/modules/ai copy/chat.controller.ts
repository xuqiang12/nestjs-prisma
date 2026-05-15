import { Body, Controller, Post, Res } from '@nestjs/common'
import { AgentService } from '../ai/agent.service'
import { Public } from '../../common/decorators/public.decorator'

@Controller('chat')
export class ChatController {
  constructor(private readonly agent: AgentService) {}
  @Public()
  @Post('stream1')
  async stream(@Body() body: { message: string }, @Res() res) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Connection', 'keep-alive')
    await this.agent.run(body.message, res)
  }
}
