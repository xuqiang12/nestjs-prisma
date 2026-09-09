// 这个服务负责首页配置和首页组件的查询保存。
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { formatPage } from 'src/common/utils/pagination'
import { SaveHomeComponentsDto } from './dto/component.dto'
import {
  CreateHomeDecorationDto,
  UpdateHomeDecorationDto,
  UpdateHomeDecorationStatusDto,
} from './dto/decoration.dto'
import { HomeDecorationListQueryDto } from './dto/query.dto'
import { HOME_SCENES, HOME_STATUS } from './home.constants'

type HomeDecorationWithComponents = Prisma.HomeDecorationGetPayload<{
  include: {
    components: true
  }
}>

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  // 查询当前启用的首页主配置，供小程序首页公开读取。
  async getHomeConfig() {
    const decoration = await this.prisma.homeDecoration.findFirst({
      where: { scene: 'homePage', status: HOME_STATUS.enabled },
      include: this.enabledComponentsInclude(),
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })

    return decoration ? this.toHomeDecoration(decoration) : this.emptyDecoration('mock-home')
  }

  // 查询启用的频道或联动内容配置，供小程序按 ID 读取内容。
  async getContentDetail(id: string) {
    const decoration = await this.prisma.homeDecoration.findFirst({
      where: { id, status: HOME_STATUS.enabled },
      include: this.enabledComponentsInclude(),
    })

    return decoration ? this.toHomeDecoration(decoration) : this.emptyDecoration(id)
  }

  // 查询首页配置分页列表，并按后台搜索条件筛选。
  async listDecorations(query: HomeDecorationListQueryDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.HomeDecorationWhereInput = {
      scene: query.scene || undefined,
      name: query.name ? { contains: query.name, mode: 'insensitive' as const } : undefined,
      status: query.status !== undefined ? Number(query.status) : undefined,
    }
    const [list, total] = await this.prisma.$transaction([
      this.prisma.homeDecoration.findMany({
        where,
        orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.homeDecoration.count({ where }),
    ])

    return formatPage(list, total, pageNum, pageSize)
  }

  // 查询单个首页配置详情，并带出当前配置下的组件。
  async getDecorationDetail(id: string) {
    const decoration = await this.prisma.homeDecoration.findUnique({
      where: { id },
      include: {
        components: {
          orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
        },
      },
    })
    if (!decoration) {
      throw new NotFoundException('首页配置不存在')
    }
    return decoration
  }

  // 创建首页配置，并在启用首页主配置时关闭其它主配置。
  async createDecoration(dto: CreateHomeDecorationDto) {
    const data = {
      name: dto.name,
      scene: dto.scene,
      status: dto.status ?? HOME_STATUS.enabled,
      sortNo: dto.sortNo ?? 0,
      remark: dto.remark,
    }
    if (data.scene === HOME_SCENES[0] && data.status === HOME_STATUS.enabled) {
      await this.prisma.$transaction([
        this.prisma.homeDecoration.updateMany({
          where: { scene: HOME_SCENES[0] },
          data: { status: HOME_STATUS.disabled },
        }),
        this.prisma.homeDecoration.create({ data }),
      ])
    } else {
      await this.prisma.homeDecoration.create({ data })
    }
    return '首页配置新增成功'
  }

  // 更新首页配置基础信息，并保护当前首页主配置不被直接停用。
  async updateDecoration(dto: UpdateHomeDecorationDto) {
    const { id, ...data } = dto
    const decoration = await this.ensureDecoration(id)
    const nextScene = data.scene ?? decoration.scene
    const nextStatus = data.status ?? decoration.status
    if (decoration.scene === HOME_SCENES[0] && decoration.status === HOME_STATUS.enabled) {
      if (nextScene !== HOME_SCENES[0] || nextStatus === HOME_STATUS.disabled) {
        throw new BadRequestException('当前首页主配置不可禁用')
      }
    }
    if (nextScene === HOME_SCENES[0] && nextStatus === HOME_STATUS.enabled) {
      await this.prisma.$transaction([
        this.prisma.homeDecoration.updateMany({
          where: { scene: HOME_SCENES[0], id: { not: id } },
          data: { status: HOME_STATUS.disabled },
        }),
        this.prisma.homeDecoration.update({ where: { id }, data }),
      ])
    } else {
      await this.prisma.homeDecoration.update({ where: { id }, data })
    }
    return '首页配置修改成功'
  }

  // 更新首页配置启用状态，并保证首页主配置切换规则。
  async updateDecorationStatus(dto: UpdateHomeDecorationStatusDto) {
    const decoration = await this.ensureDecoration(dto.id)
    if (
      decoration.scene === HOME_SCENES[0] &&
      decoration.status === HOME_STATUS.enabled &&
      dto.status === HOME_STATUS.disabled
    ) {
      throw new BadRequestException('当前首页主配置不可禁用')
    }
    if (decoration.scene === HOME_SCENES[0] && dto.status === HOME_STATUS.enabled) {
      await this.prisma.$transaction([
        this.prisma.homeDecoration.updateMany({
          where: { scene: HOME_SCENES[0], id: { not: dto.id } },
          data: { status: HOME_STATUS.disabled },
        }),
        this.prisma.homeDecoration.update({
          where: { id: dto.id },
          data: { status: dto.status },
        }),
      ])
    } else {
      await this.prisma.homeDecoration.update({
        where: { id: dto.id },
        data: { status: dto.status },
      })
    }
    return '首页配置状态修改成功'
  }

  // 查询指定首页配置下的组件列表。
  async listComponents(decorationId: string) {
    await this.ensureDecoration(decorationId)
    return this.prisma.homeComponent.findMany({
      where: { decorationId },
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })
  }

  // 一次性保存首页装修组件列表，统一处理新增、更新、排序和软删除。
  async saveComponents(dto: SaveHomeComponentsDto) {
    await this.ensureDecoration(dto.decorationId)
    const existingComponents = await this.prisma.homeComponent.findMany({
      where: { decorationId: dto.decorationId },
      select: { id: true },
    })
    const existingIds = new Set(existingComponents.map((item) => item.id))
    const submittedIds = dto.components.map((item) => item.id).filter(Boolean) as string[]
    const invalidId = submittedIds.find((id) => !existingIds.has(id))
    if (invalidId) {
      throw new BadRequestException('存在不属于当前配置的组件')
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.homeComponent.updateMany({
        where: {
          decorationId: dto.decorationId,
          id: submittedIds.length ? { notIn: submittedIds } : undefined,
        },
        data: { status: HOME_STATUS.disabled },
      })

      for (let index = 0; index < dto.components.length; index += 1) {
        const item = dto.components[index]
        const data = {
          templateId: item.templateId,
          templateName: item.templateName,
          info: item.info as Prisma.InputJsonValue,
          sortNo: index,
          status: HOME_STATUS.enabled,
        }
        if (item.id) {
          await tx.homeComponent.update({
            where: { id: item.id },
            data,
          })
        } else {
          await tx.homeComponent.create({
            data: {
              decorationId: dto.decorationId,
              ...data,
            },
          })
        }
      }

      return tx.homeComponent.findMany({
        where: { decorationId: dto.decorationId, status: HOME_STATUS.enabled },
        orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
      })
    })
  }

  // 生成只包含启用组件的 Prisma include 参数。
  private enabledComponentsInclude() {
    return {
      components: {
        where: { status: HOME_STATUS.enabled },
        orderBy: [{ sortNo: 'asc' as const }, { id: 'asc' as const }],
      },
    }
  }

  // 将首页配置数据库记录转换为小程序使用的数据结构。
  private toHomeDecoration(decoration: HomeDecorationWithComponents) {
    return {
      id: decoration.id,
      name: decoration.name,
      scene: decoration.scene,
      components: decoration.components.map((component) => ({
        id: component.id,
        templateId: component.templateId,
        templateName: component.templateName,
        info: component.info,
      })),
    }
  }

  // 生成空首页配置结构，保证公开读取接口有稳定返回。
  private emptyDecoration(id: string) {
    return {
      id,
      name: '',
      scene: 'empty',
      components: [],
    }
  }

  // 确认首页配置存在并返回记录。
  private async ensureDecoration(id: string) {
    const decoration = await this.prisma.homeDecoration.findUnique({ where: { id } })
    if (!decoration) {
      throw new NotFoundException('首页配置不存在')
    }
    return decoration
  }

}
