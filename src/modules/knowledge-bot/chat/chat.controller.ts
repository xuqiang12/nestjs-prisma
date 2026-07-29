import { Controller, Post, Body, Res, Req } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request, Response } from 'express'
import { ChatService } from './chat.service'
import { ChatRequestDto, ChatStreamRequestDto } from './dto/chat.dto'
import { Permissions } from '../../../common/decorators/permissions.decorator'

type AuthenticatedRequest = Request & {
  user: {
    userId: string
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
  // 普通知识库聊天接口，返回一次完整的 AI 回复。
  async chat(@Body() body: ChatRequestDto, @Req() req: AuthenticatedRequest) {
    return this.chatService.chat(body, req.user.userId)
  }

  @ApiOperation({ summary: '知识库流式对话' })
  @ApiBody({ type: ChatStreamRequestDto })
  @Permissions('ai:chat:send')
  @Post('stream')
  // 流式知识库聊天接口，通过 SSE 持续输出模型生成片段。
  async stream(@Body() body: ChatStreamRequestDto, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    // 这里直接写 Express Response，所以不会经过普通 JSON 响应封装。
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      for await (const event of this.chatService.stream(body, req.user.userId)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify(this.toStreamErrorEvent(error))}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  }

  private toStreamErrorEvent(error: unknown) {
    const message = error instanceof Error ? error.message : 'AI 流式响应异常，请稍后重试'
    return {
      type: 'error',
      code: this.toStreamErrorCode(message),
      message: this.toPublicStreamErrorMessage(message),
    }
  }

  private toStreamErrorCode(message: string) {
    if (message.includes('敏感词')) return 'SENSITIVE_WORD_BLOCKED'
    if (message.includes('智能体不存在或未启用')) return 'AGENT_NOT_AVAILABLE'
    if (message.includes('提示词不存在或未启用')) return 'PROMPT_NOT_AVAILABLE'
    if (message.includes('工作流不存在或未启用')) return 'WORKFLOW_NOT_AVAILABLE'
    if (message.includes('未授权工具')) return 'TOOL_NOT_ALLOWED'
    return 'CHAT_STREAM_ERROR'
  }

  private toPublicStreamErrorMessage(message: string) {
    if (message.includes('敏感词')) return '内容包含敏感词，已拦截'
    if (message.includes('智能体不存在或未启用')) return '智能体不存在或未启用'
    if (message.includes('提示词不存在或未启用')) return '智能体绑定的提示词不存在或未启用'
    if (message.includes('工作流不存在或未启用')) return '工作流不存在或未启用'
    if (message.includes('未授权工具')) return '智能体未授权工具'
    return 'AI 流式响应异常，请稍后重试'
  }
}
