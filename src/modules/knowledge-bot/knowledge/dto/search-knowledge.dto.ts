import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class SearchKnowledgeDto {
  @ApiProperty({ description: '检索关键词' })
  @IsString()
  query: string

  @ApiPropertyOptional({ description: '返回数量', default: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number
}
