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

  it('uses recent user history for short follow-up questions', async () => {
    const { service, vectorStoreService } = createService()

    await service.buildCompletion({
      question: '企业版呢？',
      history: [
        { role: 'user', content: '智能办公助手Pro怎么卖？' },
        { role: 'assistant', content: '基础版是1999元/年。' },
      ],
      allowedToolCodes: ['search_knowledge'],
    })

    expect(vectorStoreService.similaritySearch).toHaveBeenCalledWith(
      '智能办公助手Pro怎么卖？\n企业版呢？',
      5,
      expect.any(Object),
    )
  })
})
