/**
 * 聊天服务 - 处理对话业务逻辑
 * 负责知识库创建和相似文档搜索
 */
import { PrismaClient } from '@prisma/client'
import { WorkflowService } from '../graph/workflow.service.ts'

const prisma = new PrismaClient()

export class ChatService {
  constructor(private readonly workflowService: WorkflowService) {}
  async workflowChat(message: string) {
    console.log(1111)
    return this.workflowService.run(message)
  }
}
