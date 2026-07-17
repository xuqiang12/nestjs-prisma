import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import {
  CreateHomeComponentDto,
  SortHomeComponentsDto,
  UpdateHomeComponentDto,
  UpdateHomeComponentStatusDto,
} from './dto/component.dto'
import {
  CreateHomeDecorationDto,
  UpdateHomeDecorationDto,
  UpdateHomeDecorationStatusDto,
} from './dto/decoration.dto'
import { HomeDecorationListQueryDto } from './dto/query.dto'
import { HOME_STATUS } from './home.constants'

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
    await this.prisma.homeDecoration.create({
      data: {
        id: dto.id,
        name: dto.name,
        scene: dto.scene,
        status: dto.status ?? HOME_STATUS.enabled,
        sortNo: dto.sortNo ?? 0,
        remark: dto.remark,
      },
    })
    return '首页配置新增成功'
  }

  async updateDecoration(dto: UpdateHomeDecorationDto) {
    const { id, ...data } = dto
    await this.ensureDecoration(id)
    await this.prisma.homeDecoration.update({ where: { id }, data })
    return '首页配置修改成功'
  }

  async updateDecorationStatus(dto: UpdateHomeDecorationStatusDto) {
    await this.ensureDecoration(dto.id)
    await this.prisma.homeDecoration.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '首页配置状态修改成功'
  }

  async listComponents(decorationId: string) {
    await this.ensureDecoration(decorationId)
    return this.prisma.homeComponent.findMany({
      where: { decorationId },
      orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
    })
  }

  async createComponent(dto: CreateHomeComponentDto) {
    await this.ensureDecoration(dto.decorationId)
    await this.prisma.homeComponent.create({
      data: {
        id: dto.id,
        decorationId: dto.decorationId,
        templateId: dto.templateId,
        templateName: dto.templateName,
        info: dto.info as Prisma.InputJsonValue,
        sortNo: dto.sortNo ?? 0,
        status: dto.status ?? HOME_STATUS.enabled,
      },
    })
    return '首页组件新增成功'
  }

  async updateComponent(dto: UpdateHomeComponentDto) {
    const { id, ...dtoData } = dto
    await this.ensureComponent(id)
    if (dtoData.decorationId) {
      await this.ensureDecoration(dtoData.decorationId)
    }

    const data: Prisma.HomeComponentUpdateInput = {
      decoration: dtoData.decorationId
        ? {
            connect: { id: dtoData.decorationId },
          }
        : undefined,
      templateId: dtoData.templateId,
      templateName: dtoData.templateName,
      info: dtoData.info as Prisma.InputJsonValue,
      sortNo: dtoData.sortNo,
      status: dtoData.status,
    }
    await this.prisma.homeComponent.update({ where: { id }, data })
    return '首页组件修改成功'
  }

  async updateComponentStatus(dto: UpdateHomeComponentStatusDto) {
    await this.ensureComponent(dto.id)
    await this.prisma.homeComponent.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '首页组件状态修改成功'
  }

  async sortComponents(dto: SortHomeComponentsDto) {
    await this.ensureDecoration(dto.decorationId)
    const count = await this.prisma.homeComponent.count({
      where: {
        decorationId: dto.decorationId,
        id: { in: dto.items.map((item) => item.id) },
      },
    })
    if (count !== dto.items.length) {
      throw new BadRequestException('存在不属于当前配置的组件')
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.homeComponent.update({
          where: { id: item.id },
          data: { sortNo: item.sortNo },
        }),
      ),
    )
    return '首页组件排序修改成功'
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

  private async ensureComponent(id: string) {
    const component = await this.prisma.homeComponent.findUnique({ where: { id } })
    if (!component) {
      throw new NotFoundException('首页组件不存在')
    }
    return component
  }
}
