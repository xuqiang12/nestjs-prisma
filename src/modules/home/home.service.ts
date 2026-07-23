import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { PrismaService } from 'nestjs-prisma'
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

  async getHomeConfig() {
    const decoration = await this.prisma.homeDecoration.findFirst({
      where: { scene: 'homePage', status: HOME_STATUS.enabled },
      include: this.enabledComponentsInclude(),
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })

    return decoration ? this.toHomeDecoration(decoration) : this.emptyDecoration('mock-home')
  }

  async getContentDetail(id: string) {
    const decoration = await this.prisma.homeDecoration.findFirst({
      where: { id, status: HOME_STATUS.enabled },
      include: this.enabledComponentsInclude(),
    })

    return decoration ? this.toHomeDecoration(decoration) : this.emptyDecoration(id)
  }

  async listDecorations(query: HomeDecorationListQueryDto) {
    return this.prisma.homeDecoration.findMany({
      where: query.scene ? { scene: query.scene } : undefined,
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })
  }

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

  async createDecoration(dto: CreateHomeDecorationDto) {
    const id = dto.id || randomUUID()
    const data = {
      id,
      name: dto.name,
      scene: dto.scene,
      status: dto.status ?? HOME_STATUS.enabled,
      sortNo: dto.sortNo ?? 0,
      remark: dto.remark,
    }
    if (data.scene === HOME_SCENES[0] && data.status === HOME_STATUS.enabled) {
      await this.prisma.$transaction([
        this.prisma.homeDecoration.updateMany({
          where: { scene: HOME_SCENES[0], id: { not: data.id } },
          data: { status: HOME_STATUS.disabled },
        }),
        this.prisma.homeDecoration.create({ data }),
      ])
    } else {
      await this.prisma.homeDecoration.create({ data })
    }
    return '首页配置新增成功'
  }

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

  async listComponents(decorationId: string) {
    await this.ensureDecoration(decorationId)
    return this.prisma.homeComponent.findMany({
      where: { decorationId },
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })
  }

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
              id: randomUUID(),
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

  private enabledComponentsInclude() {
    return {
      components: {
        where: { status: HOME_STATUS.enabled },
        orderBy: [{ sortNo: 'asc' as const }, { id: 'asc' as const }],
      },
    }
  }

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

  private emptyDecoration(id: string) {
    return {
      id,
      name: '',
      scene: 'empty',
      components: [],
    }
  }

  private async ensureDecoration(id: string) {
    const decoration = await this.prisma.homeDecoration.findUnique({ where: { id } })
    if (!decoration) {
      throw new NotFoundException('首页配置不存在')
    }
    return decoration
  }

}
