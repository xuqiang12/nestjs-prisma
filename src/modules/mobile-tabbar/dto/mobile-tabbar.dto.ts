// 这个文件定义小程序底部导航后台接口的入参校验。
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import {
  MOBILE_TABBAR_COLOR_MODES,
  MOBILE_TABBAR_MODES,
  MOBILE_TABBAR_PAGE_OPTIONS,
  MOBILE_TABBAR_RADIUS_MODES,
} from '../mobile-tabbar.constants'

export class MobileTabBarItemDto {
  @ApiPropertyOptional({ description: '菜单项 ID，前端草稿可不传' })
  @IsString()
  @IsOptional()
  id?: string

  @ApiProperty({ description: '菜单名称，最多 5 个字符' })
  @IsString()
  @MaxLength(5)
  name: string

  @ApiPropertyOptional({ description: '未选中图标地址' })
  @IsString()
  @IsOptional()
  icon?: string

  @ApiPropertyOptional({ description: '选中图标地址' })
  @IsString()
  @IsOptional()
  activeIcon?: string

  @ApiProperty({ description: '链接类型，当前仅支持小程序页面' })
  @IsIn(['page'])
  linkType: string

  @ApiProperty({ description: '跳转页面', enum: MOBILE_TABBAR_PAGE_OPTIONS.map((item) => item.value) })
  @IsString()
  pagePath: string

  @ApiPropertyOptional({ description: '排序' })
  @IsInt()
  @IsOptional()
  sortNo?: number
}

export class SaveMobileTabBarConfigDto {
  @ApiPropertyOptional({ description: '配置 ID，新增时可不传' })
  @IsString()
  @IsOptional()
  id?: string

  @ApiProperty({ description: '导航名称，最多 15 个字' })
  @IsString()
  @MaxLength(15)
  name: string

  @ApiPropertyOptional({ description: '导航栏类型', enum: MOBILE_TABBAR_MODES })
  @IsIn(MOBILE_TABBAR_MODES)
  @IsOptional()
  tabBarMode?: string

  @ApiPropertyOptional({ description: '导航背景色模式', enum: MOBILE_TABBAR_COLOR_MODES })
  @IsIn(MOBILE_TABBAR_COLOR_MODES)
  @IsOptional()
  bgColorMode?: string

  @ApiPropertyOptional({ description: '自定义背景色' })
  @IsString()
  @IsOptional()
  bgColor?: string

  @ApiPropertyOptional({ description: '文字颜色模式', enum: MOBILE_TABBAR_COLOR_MODES })
  @IsIn(MOBILE_TABBAR_COLOR_MODES)
  @IsOptional()
  textColorMode?: string

  @ApiPropertyOptional({ description: '普通文字颜色' })
  @IsString()
  @IsOptional()
  textColor?: string

  @ApiPropertyOptional({ description: '选中文字颜色' })
  @IsString()
  @IsOptional()
  activeColor?: string

  @ApiPropertyOptional({ description: '背景圆角模式', enum: MOBILE_TABBAR_RADIUS_MODES })
  @IsIn(MOBILE_TABBAR_RADIUS_MODES)
  @IsOptional()
  radiusMode?: string

  @ApiProperty({ type: [MobileTabBarItemDto], description: '菜单配置，数量 2-5 个' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MobileTabBarItemDto)
  items: MobileTabBarItemDto[]
}

export class MobileTabBarDetailQueryDto {
  @ApiProperty({ description: '配置 ID' })
  @IsString()
  id: string
}

export class UpdateMobileTabBarStatusDto {
  @ApiProperty({ description: '配置 ID' })
  @IsString()
  id: string

  @ApiProperty({ description: '状态：1 启用，0 禁用', enum: [0, 1] })
  @IsIn([0, 1])
  status: number
}
