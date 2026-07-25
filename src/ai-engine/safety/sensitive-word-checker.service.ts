import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'

export type SensitiveWordScope = 'input' | 'output'

export type SensitiveWordHit = {
  word: string
  action: string
}

@Injectable()
export class SensitiveWordCheckerService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndApply(content: string, scope: SensitiveWordScope) {
    const words = await this.prisma.aiSensitiveWord.findMany({
      where: {
        status: 1,
        scope: { in: [scope, 'both'] },
      },
      select: {
        word: true,
        action: true,
        replaceWith: true,
      },
    })

    const hits: SensitiveWordHit[] = []
    let nextContent = content

    for (const item of words) {
      if (!item.word || !nextContent.includes(item.word)) {
        continue
      }

      hits.push({ word: item.word, action: item.action })

      if (item.action === 'block') {
        throw new BadRequestException('内容包含敏感词，已拦截')
      }

      if (item.action === 'replace') {
        nextContent = nextContent.split(item.word).join(item.replaceWith || '*')
      }
    }

    return { content: nextContent, hits }
  }
}
