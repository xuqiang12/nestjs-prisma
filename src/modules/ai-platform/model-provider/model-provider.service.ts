import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { ModelProviderListDto } from './model-provider.dto'

@Injectable()
export class ModelProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ModelProviderListDto) {
    return this.prisma.aiModelProvider.findMany({
      where: query.status !== undefined ? { status: Number(query.status) } : {},
      orderBy: { updatedAt: 'desc' },
    })
  }

  async options() {
    return this.prisma.aiModelProvider.findMany({
      where: { status: 1 },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        baseUrl: true,
        apiKeyEnv: true,
      },
    })
  }
}
