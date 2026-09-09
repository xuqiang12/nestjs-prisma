// 这个文件定义首页配置查询接口的请求参数。
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

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
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNum?: number

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number

  @ApiPropertyOptional({ description: '配置名称' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: '场景类型' })
  @IsString()
  @IsOptional()
  scene?: string

  @ApiPropertyOptional({ description: '状态：1 启用，0 停用' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class HomeComponentListQueryDto {
  @ApiProperty({ description: '所属首页配置 ID' })
  @IsString()
  decorationId: string
}
