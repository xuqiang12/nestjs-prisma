import { Controller, Get, Post, Body, Patch, Param, Delete, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ChatService } from './chat.service'
import { CreateChatDto } from './dto/create-chat.dto'
import { UpdateChatDto } from './dto/update-chat.dto'

@ApiTags('聊天模块')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: '发起流式聊天' })
  @Post('stream')
  stream(@Body() message: CreateChatDto, @Res() res: any) {
    return this.chatService.streamChat(message, res)
  }

  @ApiOperation({ summary: '查询聊天记录列表' })
  @Get()
  findAll() {
    return this.chatService.findAll()
  }

  @ApiOperation({ summary: '查询聊天记录详情' })
  @ApiParam({ name: 'id', description: '聊天记录 ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(+id)
  }

  @ApiOperation({ summary: '修改聊天记录' })
  @ApiParam({ name: 'id', description: '聊天记录 ID' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChatDto: UpdateChatDto) {
    return this.chatService.update(+id, updateChatDto)
  }

  @ApiOperation({ summary: '删除聊天记录' })
  @ApiParam({ name: 'id', description: '聊天记录 ID' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chatService.remove(+id)
  }
}
