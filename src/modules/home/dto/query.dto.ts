import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class HomeContentDetailQueryDto {
  @ApiProperty({ description: '首页配置或频道内容 ID' })
  @IsString()
  id: string
}

export class HomeDecorationDetailQueryDto {
  @ApiProperty({ description: '首页配置 ID' })
  @IsString()
  id: string
}

export class HomeDecorationListQueryDto {
  @ApiPropertyOptional({ description: '场景类型' })
  @IsString()
  @IsOptional()
  scene?: string
}

export class HomeComponentListQueryDto {
  @ApiProperty({ description: '所属首页配置 ID' })
  @IsString()
  decorationId: string
}
