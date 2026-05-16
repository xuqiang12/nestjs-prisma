import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator'

/**
 * 搜索相似文档请求 DTO
 */
export class SearchSimilarDto {
  @IsString()
  @IsNotEmpty()
  message: string

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number
}
