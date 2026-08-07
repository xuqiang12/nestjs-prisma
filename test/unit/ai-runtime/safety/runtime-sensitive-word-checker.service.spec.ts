// 校验新版智能体运行时敏感词检查服务的拦截和替换行为。
import { BadRequestException } from '@nestjs/common'
import { SensitiveWordCheckerService } from 'src/ai-runtime/safety/sensitive-word-checker.service'

describe('SensitiveWordCheckerService', () => {
  const prisma = {
    aiSensitiveWord: {
      findMany: jest.fn(),
    },
  }

  beforeEach(() => {
    prisma.aiSensitiveWord.findMany.mockReset()
  })

  it('blocks content when an enabled blocking word matches the target scope', async () => {
    prisma.aiSensitiveWord.findMany.mockResolvedValue([
      { word: 'secret', action: 'block', replaceWith: null },
    ])
    const service = new SensitiveWordCheckerService(prisma as any)

    await expect(service.checkAndApply('contains secret', 'input')).rejects.toThrow(BadRequestException)
  })

  it('replaces content and reports hits for replacement words', async () => {
    prisma.aiSensitiveWord.findMany.mockResolvedValue([
      { word: 'bad', action: 'replace', replaceWith: '*' },
    ])
    const service = new SensitiveWordCheckerService(prisma as any)

    const result = await service.checkAndApply('bad text', 'output')

    expect(result.content).toBe('* text')
    expect(result.hits).toEqual([{ word: 'bad', action: 'replace' }])
  })
})
