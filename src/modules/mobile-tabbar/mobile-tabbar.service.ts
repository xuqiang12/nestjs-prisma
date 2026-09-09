// 这个文件负责小程序底部导航配置的查询、保存和启用状态管理。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from 'nestjs-prisma'
import { SaveMobileTabBarConfigDto, UpdateMobileTabBarStatusDto } from './dto/mobile-tabbar.dto'
import {
  DEFAULT_MOBILE_TABBAR_CONFIG,
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

type MobileTabBarRow = {
  id: string
  name: string
  config: MobileTabBarConfig
  status: number
  updatedAt: Date
}

@Injectable()
export class MobileTabBarService {
  constructor(private readonly prisma: PrismaService) {}

  // 查询当前启用的底部导航配置，没有启用项时交给小程序原生 tabBar 展示。
  async getConfig() {
    const rows = await this.prisma.$queryRaw<MobileTabBarRow[]>`
      SELECT "id", "name", "config", "status", "updated_at" AS "updatedAt"
      FROM "mobile_tabbar_config"
      WHERE "status" = 1
      ORDER BY "updated_at" DESC, "id" ASC
      LIMIT 1
    `
    const row = rows[0]
    return row ? this.toConfig(row) : this.getNativeDefaultConfig()
  }

  // 查询后台维护的全部底部导航配置列表。
  async listConfigs() {
    const rows = await this.prisma.$queryRaw<MobileTabBarRow[]>`
      SELECT "id", "name", "config", "status", "updated_at" AS "updatedAt"
      FROM "mobile_tabbar_config"
      ORDER BY "created_at" ASC, "id" ASC
    `
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      tabBarMode: row.config.tabBarMode,
      itemCount: row.config.items.length,
      status: row.status,
      updatedAt: row.updatedAt,
    }))
  }

  // 查询后台底部导航配置详情。
  async getDetail(id: string) {
    const row = await this.ensureConfig(id)
    return {
      ...this.toConfig(row),
      status: row.status,
      updatedAt: row.updatedAt,
    }
  }

  // 保存底部导航配置内容，并保留原有启用状态。
  async saveConfig(dto: SaveMobileTabBarConfigDto) {
    const id = dto.id || (await this.nextSnowflakeId())
    const config = this.normalizeConfig(dto, id)
    const existingRows = await this.prisma.$queryRaw<{ status: number }[]>`
      SELECT "status" FROM "mobile_tabbar_config" WHERE "id" = ${id} LIMIT 1
    `
    const status = existingRows[0]?.status ?? 0
    await this.prisma.$executeRaw`
      INSERT INTO "mobile_tabbar_config" ("id", "name", "config", "status", "updated_at")
      VALUES (${id}, ${config.name}, ${JSON.stringify(config)}::jsonb, ${status}, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "config" = EXCLUDED."config",
        "status" = EXCLUDED."status",
        "updated_at" = CURRENT_TIMESTAMP
    `
    return config
  }

  // 更新底部导航启用状态，并确保至少保留一条启用配置。
  async updateStatus(dto: UpdateMobileTabBarStatusDto) {
    const row = await this.ensureConfig(dto.id)
    if (dto.status === 1) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE "mobile_tabbar_config" SET "status" = 0, "updated_at" = CURRENT_TIMESTAMP WHERE "id" != ${dto.id}
        `
        await tx.$executeRaw`
          UPDATE "mobile_tabbar_config" SET "status" = 1, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${dto.id}
        `
      })
      return '底部导航配置已启用'
    }
    await this.prisma.$transaction(async (tx) => {
      if (row.status === 1) {
        const enabledRows = await tx.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS "count" FROM "mobile_tabbar_config" WHERE "status" = 1
        `
        if ((enabledRows[0]?.count ?? 0n) <= 1n) {
          throw new BadRequestException('至少保留一条启用的底部导航配置')
        }
      }
      await tx.$executeRaw`
        UPDATE "mobile_tabbar_config" SET "status" = 0, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ${dto.id}
      `
    })
    return '底部导航配置已禁用'
  }

  // 规范化底部导航保存参数，统一补齐默认配置字段。
  private normalizeConfig(dto: SaveMobileTabBarConfigDto, id: string): MobileTabBarConfig {
    if (!Array.isArray(dto.items) || dto.items.length < 2 || dto.items.length > 5) {
      throw new BadRequestException('底部导航菜单数量必须为 2-5 个')
    }
    const validPagePaths = new Set<string>(MOBILE_TABBAR_PAGE_OPTIONS.map((item) => item.value))
    const invalidItem = dto.items.find((item) => !validPagePaths.has(item.pagePath))
    if (invalidItem) {
      throw new BadRequestException('底部导航跳转页面不在允许范围内')
    }

    return {
      id,
      name: dto.name,
      tabBarMode: dto.tabBarMode ?? DEFAULT_MOBILE_TABBAR_CONFIG.tabBarMode,
      bgColorMode: dto.bgColorMode ?? DEFAULT_MOBILE_TABBAR_CONFIG.bgColorMode,
      bgColor: dto.bgColor ?? DEFAULT_MOBILE_TABBAR_CONFIG.bgColor,
      textColorMode: dto.textColorMode ?? DEFAULT_MOBILE_TABBAR_CONFIG.textColorMode,
      textColor: dto.textColor ?? DEFAULT_MOBILE_TABBAR_CONFIG.textColor,
      activeColor: dto.activeColor ?? DEFAULT_MOBILE_TABBAR_CONFIG.activeColor,
      radiusMode: dto.radiusMode ?? DEFAULT_MOBILE_TABBAR_CONFIG.radiusMode,
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

  // 将数据库记录转换为前端使用的底部导航配置。
  private toConfig(row: MobileTabBarRow): MobileTabBarConfig {
    return {
      ...row.config,
      id: row.id,
      name: row.name,
    }
  }

  // 返回空的原生模式配置，让小程序使用自身发布时的 tabBar。
  private getNativeDefaultConfig(): MobileTabBarConfig {
    return {
      ...DEFAULT_MOBILE_TABBAR_CONFIG,
      tabBarMode: 'native',
      items: [],
    }
  }

  // 确保指定底部导航配置存在。
  private async ensureConfig(id: string) {
    const rows = await this.prisma.$queryRaw<MobileTabBarRow[]>`
      SELECT "id", "name", "config", "status", "updated_at" AS "updatedAt"
      FROM "mobile_tabbar_config"
      WHERE "id" = ${id}
      LIMIT 1
    `
    const row = rows[0]
    if (!row) {
      throw new NotFoundException('底部导航配置不存在')
    }
    return row
  }

  // 生成新增底部导航配置使用的雪花 ID。
  private async nextSnowflakeId() {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`SELECT next_snowflake_id() AS id`
    return rows[0].id
  }
}
