// 校验技能包安装到智能体时的工具合并和配置边界。
import { BadRequestException } from '@nestjs/common'
import { SkillPackageService } from 'src/modules/ai-platform/skill-package/skill-package.service'

type ToolState = {
  enabled?: boolean
  exposure?: 'agent' | 'internal'
}

describe('SkillPackageService', () => {
  // 构造只覆盖技能包安装行为的内存依赖。
  function createService(options: {
    agentToolCodes?: string[]
    skillToolCodes?: string[]
    tools?: Record<string, ToolState>
  } = {}) {
    const agent = {
      id: 'agent-1',
      promptId: 'prompt-1',
      mode: 'chat',
      model: 'model',
      temperature: 0.7,
      topP: 0.8,
      knowledgeEnabled: false,
      toolCodes: options.agentToolCodes ?? [],
      workflowCode: 'workflow-agent',
    }
    const skillPackage = {
      id: 'skill-1',
      code: 'skill',
      name: '技能包',
      status: 1,
      promptIds: [],
      toolCodes: options.skillToolCodes ?? [],
      workflowCode: undefined,
      agentDefaults: {},
    }
    const update = jest.fn().mockResolvedValue(agent)
    const prisma = {
      aiSkillPackage: {
        findUnique: jest.fn().mockResolvedValue(skillPackage),
      },
      aiAgent: {
        findUnique: jest.fn().mockResolvedValue(agent),
        update,
      },
    }
    const tools = options.tools ?? {
      weather: {},
      search: {},
      calculator: {},
    }
    const registry = {
      getTool: jest.fn((code: string) => {
        const tool = tools[code]
        if (!tool) {
          return undefined
        }
        return {
          code,
          enabled: tool.enabled ?? true,
          exposure: tool.exposure ?? 'agent',
        }
      }),
    }
    const service = new SkillPackageService(prisma as any, registry as any)
    return { service, prisma, update }
  }

  it('merges skill tools with agent tools and keeps first occurrence order', async () => {
    const { service, update } = createService({
      agentToolCodes: ['weather', 'search'],
      skillToolCodes: ['calculator', 'weather'],
    })

    await service.installToAgent({ packageId: 'skill-1', agentId: 'agent-1' })

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'agent-1' },
      data: expect.objectContaining({
        toolCodes: ['weather', 'search', 'calculator'],
      }),
    }))
  })

  it('uses skill tools when agent has no tools', async () => {
    const { service, update } = createService({
      agentToolCodes: [],
      skillToolCodes: ['weather', 'search'],
    })

    await service.installToAgent({ packageId: 'skill-1', agentId: 'agent-1' })

    expect(update.mock.calls[0][0].data.toolCodes).toEqual(['weather', 'search'])
  })

  it('keeps agent tools when skill has no tools', async () => {
    const { service, update } = createService({
      agentToolCodes: ['weather', 'search'],
      skillToolCodes: [],
    })

    await service.installToAgent({ packageId: 'skill-1', agentId: 'agent-1' })

    expect(update.mock.calls[0][0].data.toolCodes).toEqual(['weather', 'search'])
  })

  it('dedupes fully duplicated agent and skill tools', async () => {
    const { service, update } = createService({
      agentToolCodes: ['weather', 'search'],
      skillToolCodes: ['weather', 'search'],
    })

    await service.installToAgent({ packageId: 'skill-1', agentId: 'agent-1' })

    expect(update.mock.calls[0][0].data.toolCodes).toEqual(['weather', 'search'])
  })

  it('validates merged effective tools before saving agent configuration', async () => {
    const { service, update } = createService({
      agentToolCodes: ['weather'],
      skillToolCodes: ['disabled-tool'],
      tools: {
        weather: {},
        'disabled-tool': { enabled: false },
      },
    })

    await expect(service.installToAgent({ packageId: 'skill-1', agentId: 'agent-1' }))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(update).not.toHaveBeenCalled()
  })
})
