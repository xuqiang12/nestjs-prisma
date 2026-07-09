import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsObject, IsOptional, IsString } from 'class-validator'

export class CreateKnowledgeDto {
  @ApiProperty({ description: '知识内容' })
  @IsString()
  content: string

  @ApiPropertyOptional({ description: '知识元数据' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}
