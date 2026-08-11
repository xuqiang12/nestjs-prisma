// 校验知识库问答服务的检索、历史和答案校验行为。
import { BadRequestException } from '@nestjs/common'
import { KnowledgeAnswerGuardService } from 'src/ai-runtime/knowledge/knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from 'src/ai-runtime/knowledge/knowledge-evidence.service'
import { KnowledgeQAService } from 'src/ai-runtime/knowledge/knowledge-qa.service'

describe('KnowledgeQAService', () => {
  function createService(answer = '基础版本为1911元/年，企业版本为4111元/年。') {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue(answer),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-1',
          content: [
            '产品名称：智能办公助手Pro',
            '售价：',
            '基础版本：1999元/年',
            '企业版本：4999元/年',
          ].join('\n'),
          distance: 0.2,
          metadata: {},
        },
      ]),
    }
    const service = new KnowledgeQAService(
      llmService as any,
      vectorStoreService as any,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )

    return { service, llmService, vectorStoreService }
  }

  it('rejects knowledge search when the agent does not allow search_knowledge', async () => {
    const { service, vectorStoreService } = createService()

    await expect(
      service.buildCompletion({
        question: '查询知识库',
        history: [],
        allowedToolCodes: [],
      }),
    ).rejects.toThrow(BadRequestException)
    expect(vectorStoreService.similaritySearch).not.toHaveBeenCalled()
  })

  it('answers through retrieved facts and guard fallback', async () => {
    const { service } = createService()

    const result = await service.answer({
      question: '智能办公助手Pro怎么卖？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.answer).toContain('1999元/年')
    expect(result.answer).toContain('4999元/年')
    expect(result.answer).not.toContain('1911元/年')
    expect(result.answer).not.toContain('4111元/年')
    expect(result.sources).toHaveLength(1)
    expect(result.status).toBe('rejected')
  })

  it('keeps guard fallback focused on facts with required terms', async () => {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue('基础版是1919元/年，企业版是4111元/年。'),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-1',
          distance: 0.2,
          metadata: {},
          content: [
            '产品名称：智能办公助手Pro',
            '产品型号：',
            'OA-Pro-2026',
            '售价：',
            '基础版本：',
            '1999元/年',
            '企业版本：',
            '4999元/年',
            '服务期限：',
            '购买后提供一年技术支持服务',
            '售后服务政策',
            '一、退货政策',
            '购买7天内：',
            '如果产品未激活，可以申请退款',
            '换货流程：',
            '联系客服提交申请',
          ].join('\n'),
        },
      ]),
    }
    const service = new KnowledgeQAService(
      llmService as any,
      vectorStoreService as any,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )

    const result = await service.answer({
      question: '智能办公助手Pro怎么卖？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.answer).toContain('1999元/年')
    expect(result.answer).toContain('4999元/年')
    expect(result.answer).not.toContain('退货政策')
    expect(result.answer).not.toContain('换货流程')
    expect(result.answer).not.toContain('1919元/年')
    expect(result.answer).not.toContain('4111元/年')
  })

  it('returns fact alignment metadata without changing the answer', async () => {
    const { service } = createService('基础版本为1999元/年。')

    const result = await service.answer({
      question: '智能办公助手Pro怎么卖？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.answer).toBe('基础版本为1999元/年。')
    expect(result.answerFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'NUMBER', value: '1999元/年' }),
      ]),
    )
    expect(result.factAlignment.items[0].knowledgeFacts.length).toBeGreaterThan(0)
  })

  it('returns fact verification metadata without changing the answer', async () => {
    const { service } = createService('基础版本为1999元/年。')

    const result = await service.answer({
      question: '智能办公助手Pro怎么卖？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.answer).toBe('基础版本为1999元/年。')
    expect(result.factVerification.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'SUPPORTED' }),
      ]),
    )
  })

  it('returns allow grounding metadata for supported facts', async () => {
    const { service } = createService('基础版本为1999元/年。')

    const result = await service.answer({
      question: '智能办公助手Pro怎么卖？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.answer).toBe('基础版本为1999元/年。')
    expect(result.groundingDecision).toBe('ALLOW')
  })

  it('returns block grounding metadata when same subject and attribute have a different value', async () => {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue('基础版价格为2999元/年。'),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-price',
          distance: 0.2,
          metadata: {},
          content: '基础版价格为1999元/年。',
        },
      ]),
    }
    const service = new KnowledgeQAService(
      llmService as any,
      vectorStoreService as any,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )

    const result = await service.answer({
      question: '基础版价格是多少？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.factVerification.items[0].status).toBe('CONTRADICTED')
    expect(result.groundingDecision).toBe('BLOCK')
  })

  it('does not support same-value facts when the subject differs', async () => {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue('企业版价格为1999元/年。'),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-price',
          distance: 0.2,
          metadata: {},
          content: '基础版价格为1999元/年。',
        },
      ]),
    }
    const service = new KnowledgeQAService(
      llmService as any,
      vectorStoreService as any,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )

    const result = await service.answer({
      question: '企业版价格是多少？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.factVerification.items[0].status).toBe('CONTRADICTED')
    expect(result.groundingDecision).toBe('BLOCK')
  })

  it('allows attribute and value matches when both sides have no subject', async () => {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue('价格为1999元/年。'),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-price',
          distance: 0.2,
          metadata: {},
          content: '价格为1999元/年。',
        },
      ]),
    }
    const service = new KnowledgeQAService(
      llmService as any,
      vectorStoreService as any,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )

    const result = await service.answer({
      question: '价格是多少？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.factVerification.items[0].status).toBe('SUPPORTED')
    expect(result.groundingDecision).toBe('ALLOW')
  })

  it('returns block grounding metadata without letting grounding rewrite the answer', async () => {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue('基础版状态：不支持。'),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-policy',
          distance: 0.2,
          metadata: {},
          content: '基础版状态：支持。',
        },
      ]),
    }
    const guardService = new KnowledgeAnswerGuardService()
    const ensureAnswerSpy = jest.spyOn(guardService, 'ensureAnswer')
    const service = new KnowledgeQAService(
      llmService as any,
      vectorStoreService as any,
      new KnowledgeEvidenceService(),
      guardService,
    )

    const result = await service.answer({
      question: '基础版状态是什么？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.answer).toBe('基础版状态：不支持。')
    expect(result.groundingDecision).toBe('BLOCK')
    expect(llmService.invokeWithMessages).toHaveBeenCalledTimes(1)
    expect(vectorStoreService.similaritySearch).toHaveBeenCalledTimes(1)
    expect(ensureAnswerSpy).toHaveBeenCalledTimes(1)
  })

  it('returns warn grounding metadata for uncertain facts', async () => {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue('基础版状态：支持。'),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-policy',
          distance: 0.2,
          metadata: {},
          content: '基础版状态：支持；基础版状态：不支持。',
        },
      ]),
    }
    const service = new KnowledgeQAService(
      llmService as any,
      vectorStoreService as any,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )

    const result = await service.answer({
      question: '基础版状态是什么？',
      history: [],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(result.answer).toBe('基础版状态：支持。')
    expect(result.groundingDecision).toBe('WARN')
  })

  it('does not carry previous user history into retrieval when current question is complete', async () => {
    const { service, vectorStoreService } = createService()

    await service.buildCompletion({
      question: '批改园景区导览',
      history: [
        { role: 'user', content: '智能办公助手Pro怎么卖？' },
        { role: 'assistant', content: '基础版是1999元/年。' },
      ],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(vectorStoreService.similaritySearch).toHaveBeenCalledWith(
      '批改园景区导览',
      5,
      expect.any(Object),
    )
  })

  it('uses planner rewritten question instead of rebuilding follow-up retrieval', async () => {
    const { service, vectorStoreService } = createService()

    await service.buildCompletion({
      question: 'enterprise?',
      originalQuestion: 'enterprise?',
      rewrittenQuestion: 'enterprise version price',
      rewriteApplied: true,
      history: [
        { role: 'user', content: 'basic version price' },
        { role: 'assistant', content: 'basic version is 1999 per year' },
      ],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(vectorStoreService.similaritySearch).toHaveBeenCalledWith(
      'enterprise version price',
      5,
      expect.any(Object),
    )
  })
})
