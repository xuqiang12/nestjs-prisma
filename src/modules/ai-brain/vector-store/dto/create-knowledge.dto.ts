import { IsString, IsOptional } from 'class-validator'

/**
 * 创建知识库请求 DTO
 */
export class CreateKnowledgeDto {
  @IsString()
  content: string

  @IsOptional()
  metadata?: Record<string, any>
}
