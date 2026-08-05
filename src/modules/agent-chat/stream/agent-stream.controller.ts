// 暴露新版智能体流式对话 SSE 入口。
import { Body, Controller, Post, Req, Res } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { SseEventAdapter } from '../../../ai-runtime/adapter/sse-event.adapter'
import { AgentStreamRequestDto } from './dto/agent-stream.dto'
import { AgentStreamService } from './agent-stream.service'

export type AgentStreamResponse = {
  setHeader(name: string, value: string): void
  write(chunk: string): void
  end(): void
}

type AuthenticatedRequest = Request & {
  user: {
    userId: string
  }
}

@ApiTags('新版智能体运行时')
@Controller('agent/chat')
export class AgentStreamController {
  // 注入流式事件生产服务和 SSE 协议适配器。
  constructor(
    private readonly agentStreamService: AgentStreamService,
    private readonly sseEventAdapter: SseEventAdapter,
  ) {}

  @ApiOperation({ summary: '新版智能体流式对话' })
  @ApiBody({ type: AgentStreamRequestDto })
  @Permissions('ai:chat:send')
  @Post('stream-v2')
  // 处理 v2 流式对话请求，只维护 SSE 协议边界并转发内部事件。
  async stream(@Body() body: AgentStreamRequestDto, @Req() req: AuthenticatedRequest, @Res() res: AgentStreamResponse) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    for await (const event of this.agentStreamService.stream(body, req.user.userId)) {
      res.write(this.sseEventAdapter.toSseData(event))
    }

    res.end()
  }
}
