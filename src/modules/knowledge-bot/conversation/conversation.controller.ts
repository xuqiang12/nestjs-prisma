import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { Permissions } from '../../../common/decorators/permissions.decorator'
import { ConversationService } from './conversation.service'
import {
  ConversationDetailDto,
  ConversationListDto,
  CreateConversationDto,
  DeleteConversationDto,
  RenameConversationDto,
} from './dto/conversation.dto'

type AuthenticatedRequest = Request & {
  user: {
    userId: string
  }
}

@ApiTags('智能体运行时')
@Controller('agent/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @ApiOperation({ summary: '查询 AI 会话列表' })
  @Permissions('ai:chat:send')
  @Get('list')
  // 查询当前登录用户的 AI 会话列表。
  async list(@Query() query: ConversationListDto, @Req() req: AuthenticatedRequest) {
    return this.conversationService.list(req.user.userId, query)
  }

  @ApiOperation({ summary: '新建 AI 会话' })
  @ApiBody({ type: CreateConversationDto })
  @Permissions('ai:chat:send')
  @Post('create')
  // 为当前登录用户创建一个新的 AI 会话。
  async create(@Body() body: CreateConversationDto, @Req() req: AuthenticatedRequest) {
    return this.conversationService.create(req.user.userId, body.mode || 'chat', body.title, body.agentCode)
  }

  @ApiOperation({ summary: '查询 AI 会话详情' })
  @Permissions('ai:chat:send')
  @Get('detail')
  // 查询当前登录用户拥有的 AI 会话详情。
  async detail(@Query() query: ConversationDetailDto, @Req() req: AuthenticatedRequest) {
    return this.conversationService.detail(req.user.userId, query.id)
  }

  @ApiOperation({ summary: '重命名 AI 会话' })
  @ApiBody({ type: RenameConversationDto })
  @Permissions('ai:chat:send')
  @Post('rename')
  // 修改当前登录用户拥有的 AI 会话标题。
  async rename(@Body() body: RenameConversationDto, @Req() req: AuthenticatedRequest) {
    return this.conversationService.rename(req.user.userId, body.id, body.title)
  }

  @ApiOperation({ summary: '删除 AI 会话' })
  @ApiBody({ type: DeleteConversationDto })
  @Permissions('ai:chat:send')
  @Post('delete')
  // 删除当前登录用户拥有的 AI 会话。
  async delete(@Body() body: DeleteConversationDto, @Req() req: AuthenticatedRequest) {
    return this.conversationService.delete(req.user.userId, body.id)
  }
}
