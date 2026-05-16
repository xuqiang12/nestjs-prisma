/**
 * 聊天服务 - 处理对话业务逻辑
 * 负责知识库创建和相似文档搜索
 */
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { WorkflowService } from '../graph/workflow.service'

const prisma = new PrismaClient()

@Injectable()
export class ChatService {
  constructor(private readonly workflowService: WorkflowService) {}
  async workflowChat(message: string) {
    return this.workflowService.run(message)
  }
}
