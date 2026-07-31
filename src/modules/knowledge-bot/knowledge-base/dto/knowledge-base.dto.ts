import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class KnowledgeBaseListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNum?: number

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number

  @ApiPropertyOptional({ description: '知识库名称或编码' })
  @IsString()
  @IsOptional()
  keyword?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 禁用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class CreateKnowledgeBaseDto {
  @ApiProperty({ description: '知识库名称' })
  @IsString()
  name: string

  @ApiPropertyOptional({ description: '描述' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: '分片最大字符数', default: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(5000)
  @IsOptional()
  chunkSize?: number

  @ApiPropertyOptional({ description: '分片重叠字符数', default: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  @IsOptional()
  chunkOverlap?: number

  @ApiPropertyOptional({ description: '检索返回数量', default: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  retrievalLimit?: number

  @ApiPropertyOptional({ description: '严格匹配阈值，pgvector 距离小于等于该值时视为匹配', default: 0.45 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  similarityThreshold?: number

  @ApiPropertyOptional({ description: '向量方案编码', default: 'siliconflow-default' })
  @IsString()
  @IsOptional()
  embeddingProfileCode?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 禁用', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class UpdateKnowledgeBaseDto extends PartialType(CreateKnowledgeBaseDto) {
  @ApiProperty({ description: '知识库 ID' })
  @IsString()
  id: string
}

export class KnowledgeBaseIdDto {
  @ApiProperty({ description: '知识库 ID' })
  @IsString()
  id: string
}

export class KnowledgeBaseStatusDto extends KnowledgeBaseIdDto {
  @ApiProperty({ description: '状态：1 启用，0 禁用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  status: number
}

export class KnowledgeFileListDto {
  @ApiProperty({ description: '知识库 ID' })
  @IsString()
  knowledgeBaseId: string

  @ApiPropertyOptional({ description: '文件名关键词' })
  @IsString()
  @IsOptional()
  keyword?: string
}

export class KnowledgeFileIdDto {
  @ApiProperty({ description: '文件 ID' })
  @IsString()
  fileId: string
}

export class KnowledgeBaseFileActionDto extends KnowledgeFileIdDto {
  @ApiProperty({ description: '知识库 ID' })
  @IsString()
  knowledgeBaseId: string
}

export class KnowledgeChunkListDto {
  @ApiProperty({ description: '知识库 ID' })
  @IsString()
  knowledgeBaseId: string

  @ApiPropertyOptional({ description: '文件 ID' })
  @IsString()
  @IsOptional()
  fileId?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNum?: number

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number
}

export class KnowledgeChunkIdDto {
  @ApiProperty({ description: '分片 ID' })
  @IsString()
  id: string
}

export class UpdateKnowledgeChunkDto extends KnowledgeChunkIdDto {
  @ApiProperty({ description: '分片内容' })
  @IsString()
  content: string
}

export class KnowledgeSearchTestDto {
  @ApiProperty({ description: '知识库 ID' })
  @IsString()
  knowledgeBaseId: string

  @ApiProperty({ description: '检索问题' })
  @IsString()
  query: string

  @ApiPropertyOptional({ description: '返回数量', default: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number
}
