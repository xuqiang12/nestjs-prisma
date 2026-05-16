/**
 * AI Brain 模块 - 整合 AI 核心功能的根模块
 * 包含对话、向量存储、LangGraph 工作流、LLM 和文档处理等功能
 */
import { Module } from '@nestjs/common'

import { VectorStoreController } from './vector-store/vector-store.controller'
import { VectorStoreService } from './vector-store/vector-store.service'

import { ChatService } from '../chat/chat.service'
import { WorkflowService } from './graph/workflow.service.ts'
import { ChatController } from './chat/chat.controller'

@Module({
  controllers: [ChatController, VectorStoreController],
  providers: [ChatService, VectorStoreService, WorkflowService],
})
export class AiBrainModule {}
