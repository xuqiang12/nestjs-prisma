// 固化 KnowledgeQAService 中 RAG Grounding 全链路的外部契约。
import { KnowledgeAnswerGuardService } from 'src/ai-runtime/knowledge/knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from 'src/ai-runtime/knowledge/knowledge-evidence.service'
import { KnowledgeQAService } from 'src/ai-runtime/knowledge/knowledge-qa.service'
import { KnowledgeQAResult } from 'src/ai-runtime/knowledge/knowledge.types'

// 契约含义：FactVerifier 先判断回答事实是否被知识库支持，再汇总为当前回答的 GroundingDecision。
describe('KnowledgeQAService Grounding contract', () => {
  function createService(answer: string, knowledgeContent: string) {
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue(answer),
      streamWithMessages: jest.fn(),
    }
    const vectorStoreService = {
      similaritySearch: jest.fn().mockResolvedValue([
        {
          id: 'doc-grounding',
          content: knowledgeContent,
          distance: 0.2,
          metadata: {},
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

    return { service, llmService, vectorStoreService, ensureAnswerSpy }
  }

  // 执行一次真实 KnowledgeQAService 链路，外部 LLM 和检索使用确定性 mock。
  async function answerWithGrounding(answer: string, knowledgeContent: string) {
    const setup = createService(answer, knowledgeContent)
    const result = await setup.service.answer({
      question: '查询知识库事实',
      history: [],
    })

    return { ...setup, result }
  }

  // 提取每个 AnswerFact 对应的验证状态，避免重复测试内部算法细节。
  function verificationStatuses(result: KnowledgeQAResult) {
    return result.factVerification.items.map((item) => item.status)
  }

  // SUPPORTED 表示回答事实能被知识库事实支持，因此 GroundingDecision 应放行。
  it('keeps supported answers unchanged and maps SUPPORTED to ALLOW', async () => {
    const answer = '基础版价格为1999元/年。'
    const { result, llmService, vectorStoreService, ensureAnswerSpy } = await answerWithGrounding(
      answer,
      '基础版价格为1999元/年。',
    )

    expect(result.answer).toBe(answer)
    expect(result.answerFacts).toEqual([
      expect.objectContaining({ value: '1999元/年' }),
    ])
    expect(verificationStatuses(result)).toEqual(['SUPPORTED'])
    expect(result.groundingDecision).toBe('ALLOW')
    expect(llmService.invokeWithMessages).toHaveBeenCalledTimes(1)
    expect(vectorStoreService.similaritySearch).toHaveBeenCalledTimes(1)
    expect(ensureAnswerSpy).toHaveBeenCalledTimes(1)
  })

  // CONTRADICTED 表示回答事实和知识库事实冲突，因此 GroundingDecision 应阻断标记。
  it('keeps contradicted answers unchanged and maps CONTRADICTED to BLOCK', async () => {
    const answer = '基础版状态：不支持。'
    const { result, llmService, vectorStoreService, ensureAnswerSpy } = await answerWithGrounding(
      answer,
      '基础版状态：支持。',
    )

    expect(result.answer).toBe(answer)
    expect(verificationStatuses(result)).toEqual(['CONTRADICTED'])
    expect(result.groundingDecision).toBe('BLOCK')
    expect(llmService.invokeWithMessages).toHaveBeenCalledTimes(1)
    expect(vectorStoreService.similaritySearch).toHaveBeenCalledTimes(1)
    expect(ensureAnswerSpy).toHaveBeenCalledTimes(1)
  })

  // UNCERTAIN 表示已有候选事实但当前规则无法确定支持或冲突，因此 GroundingDecision 应警告。
  it('keeps uncertain answers unchanged and maps UNCERTAIN to WARN', async () => {
    const answer = '企业版状态：支持。'
    const { result } = await answerWithGrounding(
      answer,
      '企业版状态：支持；企业版状态：不支持。',
    )

    expect(result.answer).toBe(answer)
    expect(verificationStatuses(result)).toEqual(['UNCERTAIN'])
    expect(result.groundingDecision).toBe('WARN')
  })

  // NOT_FOUND 表示回答里抽出了事实，但知识库中找不到可支持或反驳的候选事实，因此 GroundingDecision 应警告。
  it('keeps not found answers unchanged and maps NOT_FOUND to WARN', async () => {
    const answer = 'VIP版状态：不支持。'
    const { result, llmService, vectorStoreService } = await answerWithGrounding(
      answer,
      '基础版状态：支持。',
    )

    expect(result.answer).toBe(answer)
    expect(verificationStatuses(result)).toEqual(['NOT_FOUND'])
    expect(result.groundingDecision).toBe('WARN')
    expect(llmService.invokeWithMessages).toHaveBeenCalledTimes(1)
    expect(vectorStoreService.similaritySearch).toHaveBeenCalledTimes(1)
  })

  // 空验证结果表示第一版没有从回答中抽出可校验事实，不能当作完全可信，因此 GroundingDecision 应警告。
  it('maps empty verification results to WARN without automatic refusal', async () => {
    const { result, llmService, vectorStoreService } = await answerWithGrounding(
      '',
      '',
    )

    expect(result.answer).toBe('')
    expect(result.answerFacts).toEqual([])
    expect(result.factAlignment.items).toEqual([])
    expect(result.factVerification.items).toEqual([])
    expect(result.groundingDecision).toBe('WARN')
    expect(llmService.invokeWithMessages).toHaveBeenCalledTimes(1)
    expect(vectorStoreService.similaritySearch).toHaveBeenCalledTimes(1)
  })

  // 多事实全部被支持时，整体回答才允许放行。
  it('allows multi-fact answers when every fact is supported', async () => {
    const answer = '基础版价格为1999元/年；企业版价格为4999元/年。'
    const { result } = await answerWithGrounding(
      answer,
      '基础版价格为1999元/年；企业版价格为4999元/年。',
    )

    expect(result.answer).toBe(answer)
    expect(result.answerFacts).toHaveLength(2)
    expect(verificationStatuses(result)).toEqual(['SUPPORTED', 'SUPPORTED'])
    expect(result.groundingDecision).toBe('ALLOW')
  })

  // 多事实中只要存在一个冲突事实，整体回答就必须进入阻断标记。
  it('blocks multi-fact answers when one fact is supported and one is contradicted', async () => {
    const answer = '基础版状态：支持；企业版状态：不支持。'
    const { result } = await answerWithGrounding(
      answer,
      '基础版状态：支持；企业版状态：支持。',
    )

    expect(result.answer).toBe(answer)
    expect(verificationStatuses(result)).toEqual(['SUPPORTED', 'CONTRADICTED'])
    expect(result.groundingDecision).toBe('BLOCK')
  })

  // 多事实中存在不确定事实且没有冲突事实时，整体回答进入警告标记。
  it('warns multi-fact answers when supported facts coexist with uncertain facts', async () => {
    const answer = '基础版状态：支持；企业版状态：支持。'
    const { result } = await answerWithGrounding(
      answer,
      '基础版状态：支持；企业版状态：支持；企业版状态：不支持。',
    )

    expect(result.answer).toBe(answer)
    expect(verificationStatuses(result)).toEqual(['SUPPORTED', 'UNCERTAIN'])
    expect(result.groundingDecision).toBe('WARN')
  })

  // BLOCK 优先级最高，避免冲突事实被其他支持或不确定事实掩盖。
  it('keeps BLOCK priority above UNCERTAIN and SUPPORTED facts', async () => {
    const answer = '基础版状态：支持；企业版状态：支持；旗舰版状态：不支持。'
    const { result } = await answerWithGrounding(
      answer,
      '基础版状态：支持；企业版状态：支持；企业版状态：不支持；旗舰版状态：支持。',
    )

    expect(result.answer).toBe(answer)
    expect(verificationStatuses(result)).toEqual(['SUPPORTED', 'UNCERTAIN', 'CONTRADICTED'])
    expect(result.groundingDecision).toBe('BLOCK')
  })
})
