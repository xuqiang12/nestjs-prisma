import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator'
import { HOME_CUBE_LAYOUTS, HOME_TEMPLATE_IDS } from '../home.constants'

export class SaveHomeComponentItemDto {
  @ApiPropertyOptional({ description: '组件 ID，已有组件提交，新组件不提交' })
  @IsString()
  @IsOptional()
  id?: string

  @ApiProperty({ description: '组件类型', enum: HOME_TEMPLATE_IDS })
  @IsIn(HOME_TEMPLATE_IDS)
  templateId: string

  @ApiPropertyOptional({ description: '组件名称' })
  @IsString()
  @IsOptional()
  templateName?: string

  @ApiProperty({ description: `组件差异化 JSON 配置。cube.iconType 支持：${HOME_CUBE_LAYOUTS.join('、')}` })
  @IsObject()
  info: Record<string, unknown>
}

export class SaveHomeComponentsDto {
  @ApiProperty({ description: '所属配置 ID' })
  @IsString()
  decorationId: string

  @ApiProperty({ type: [SaveHomeComponentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveHomeComponentItemDto)
  components: SaveHomeComponentItemDto[]
}
