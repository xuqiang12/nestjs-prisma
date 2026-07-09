import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class DeleteKnowledgeDto {
  @ApiProperty({ description: '知识分片 ID' })
  @IsString()
  id: string
}
