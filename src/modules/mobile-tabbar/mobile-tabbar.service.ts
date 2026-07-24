import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from 'nestjs-prisma'
import { SaveMobileTabBarConfigDto } from './dto/mobile-tabbar.dto'
import {
  DEFAULT_MOBILE_TABBAR_CONFIG,
  MOBILE_TABBAR_CONFIG_ID,
  MOBILE_TABBAR_PAGE_OPTIONS,
} from './mobile-tabbar.constants'

type MobileTabBarItem = {
  id: string
  name: string
  icon: string
  activeIcon: string
  linkType: 'page'
  pagePath: string
  sortNo: number
}

type MobileTabBarConfig = {
  id: string
  name: string
  tabBarMode: string
  bgColorMode: string
  bgColor: string
  textColorMode: string
  textColor: string
  activeColor: string
  radiusMode: string
  items: MobileTabBarItem[]
}

@Injectable()
export class MobileTabBarService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const rows = await this.prisma.$queryRaw<{ config: MobileTabBarConfig; status: number }[]>`
      SELECT "config", "status" FROM "mobile_tabbar_config" WHERE "id" = ${MOBILE_TABBAR_CONFIG_ID} LIMIT 1
    `
    const row = rows[0]
    if (!row || row.status !== 1) {
      return DEFAULT_MOBILE_TABBAR_CONFIG
    }
    return row.config
  }

  async saveConfig(dto: SaveMobileTabBarConfigDto) {
    const config = this.normalizeConfig(dto)
    await this.prisma.$executeRaw`
      INSERT INTO "mobile_tabbar_config" ("id", "name", "config", "status", "updated_at")
      VALUES (${MOBILE_TABBAR_CONFIG_ID}, ${config.name}, ${JSON.stringify(config)}::jsonb, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "config" = EXCLUDED."config",
        "status" = EXCLUDED."status",
        "updated_at" = CURRENT_TIMESTAMP
    `
    return config
  }

  private normalizeConfig(dto: SaveMobileTabBarConfigDto): MobileTabBarConfig {
    if (!Array.isArray(dto.items) || dto.items.length < 2 || dto.items.length > 5) {
      throw new BadRequestException('底部导航菜单数量必须为 2-5 个')
    }
    const validPagePaths = new Set<string>(MOBILE_TABBAR_PAGE_OPTIONS.map((item) => item.value))
    const invalidItem = dto.items.find((item) => !validPagePaths.has(item.pagePath))
    if (invalidItem) {
      throw new BadRequestException('底部导航跳转页面不在允许范围内')
    }

    return {
      id: MOBILE_TABBAR_CONFIG_ID,
      name: dto.name,
      tabBarMode: dto.tabBarMode || DEFAULT_MOBILE_TABBAR_CONFIG.tabBarMode,
      bgColorMode: dto.bgColorMode || DEFAULT_MOBILE_TABBAR_CONFIG.bgColorMode,
      bgColor: dto.bgColor || DEFAULT_MOBILE_TABBAR_CONFIG.bgColor,
      textColorMode: dto.textColorMode || DEFAULT_MOBILE_TABBAR_CONFIG.textColorMode,
      textColor: dto.textColor || DEFAULT_MOBILE_TABBAR_CONFIG.textColor,
      activeColor: dto.activeColor || DEFAULT_MOBILE_TABBAR_CONFIG.activeColor,
      radiusMode: dto.radiusMode || DEFAULT_MOBILE_TABBAR_CONFIG.radiusMode,
      items: dto.items.map((item, index) => ({
        id: item.id || randomUUID(),
        name: item.name,
        icon: item.icon || '',
        activeIcon: item.activeIcon || '',
        linkType: 'page',
        pagePath: item.pagePath,
        sortNo: item.sortNo ?? index,
      })),
    }
  }
}
