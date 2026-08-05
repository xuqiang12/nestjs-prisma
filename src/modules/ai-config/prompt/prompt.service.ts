import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { CreatePromptDto, PromptListDto, PromptStatusDto, UpdatePromptDto } from './dto/prompt.dto'

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  // 查询提示词分页列表，并按配置中心筛选条件返回总数。
  async list(query: PromptListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiPromptWhereInput = {
      ...(query.code ? { code: { contains: query.code, mode: 'insensitive' } } : {}),
      ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
      ...(query.scene ? { scene: query.scene } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }

    const [list, total] = await Promise.all([
      this.prisma.aiPrompt.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.aiPrompt.count({ where }),
    ])

    return { list, total }
  }

  // 查询单个提示词详情。
  async detail(id: string) {
    return this.ensurePrompt(id)
  }

  // 创建新的提示词配置，code 由数据库函数统一生成。
  async create(dto: CreatePromptDto) {
    const code = await this.nextPromptCode()
    await this.prisma.aiPrompt.create({
      data: {
        code,
        name: dto.name,
        scene: dto.scene,
        content: dto.content,
        status: dto.status ?? 1,
        remark: dto.remark,
      },
    })
    return '提示词新增成功'
  }

  // 更新提示词配置；内容变更时同步开启自动同步的 Agent 提示词快照。
  async update(dto: UpdatePromptDto) {
    await this.ensurePrompt(dto.id)

    await this.prisma.aiPrompt.update({
      where: { id: dto.id },
      data: {
        name: dto.name,
        scene: dto.scene,
        content: dto.content,
        status: dto.status,
        remark: dto.remark,
      },
    })
    await this.syncAgentPromptSnapshots(dto.id, dto.content)
    return '提示词修改成功'
  }

  // 更新提示词启用状态。
  async updateStatus(dto: PromptStatusDto) {
    await this.ensurePrompt(dto.id)
    await this.prisma.aiPrompt.update({
      where: { id: dto.id },
      data: { status: dto.status },
    })
    return '提示词状态修改成功'
  }

  // 删除提示词前校验是否仍被 Agent 绑定，避免运行配置失效。
  async delete(id: string) {
    await this.ensurePrompt(id)
    const agentCount = await this.prisma.aiAgent.count({ where: { promptId: id } })
    if (agentCount > 0) {
      throw new BadRequestException('提示词已绑定智能体，不能删除')
    }
    await this.prisma.aiPrompt.delete({ where: { id } })
    return '提示词删除成功'
  }

  // 运行时按 code 查找已启用提示词，供 Agent 配置解析复用。
  async findEnabledByCode(code: string) {
    return this.prisma.aiPrompt.findFirst({
      where: { code, status: 1 },
    })
  }

  // 确认提示词存在并返回记录。
  private async ensurePrompt(id: string) {
    const prompt = await this.prisma.aiPrompt.findUnique({ where: { id } })
    if (!prompt) {
      throw new NotFoundException('提示词不存在')
    }
    return prompt
  }

  // 通过数据库序列函数生成提示词编码，保持编码规则集中在数据库。
  private async nextPromptCode() {
    const rows = await this.prisma.$queryRaw<{ code: string }[]>`SELECT next_prompt_code() AS code`
    return rows[0].code
  }

  // 将提示词内容同步到选择自动同步的 Agent 快照，保证运行时读取最新内容。
  private async syncAgentPromptSnapshots(promptId: string, content?: string) {
    if (content === undefined) {
      return
    }
    await this.prisma.aiAgent.updateMany({
      where: { promptId, promptSyncEnabled: true },
      data: { promptSnapshot: content },
    })
  }
}
