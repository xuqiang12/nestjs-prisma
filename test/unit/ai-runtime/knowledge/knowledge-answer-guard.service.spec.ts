// 校验知识库答案 Guard 对数字事实的校验和兜底行为。
import { KnowledgeAnswerGuardService } from 'src/ai-runtime/knowledge/knowledge-answer-guard.service'
import { KnowledgeFact } from 'src/ai-runtime/knowledge/knowledge.types'

describe('KnowledgeAnswerGuardService', () => {
  const facts: KnowledgeFact[] = [
    { text: '基础版本：1999元/年', type: 'NUMBER', value: '1999元/年', requiredTerms: ['1999元/年'] },
    { text: '企业版本：4999元/年', type: 'NUMBER', value: '4999元/年', requiredTerms: ['4999元/年'] },
  ]

  it('passes answers whose numeric facts come from knowledge facts', () => {
    const service = new KnowledgeAnswerGuardService()

    const result = service.validate('基础版本为1999元/年，企业版本为4999元/年。', facts)

    expect(result.passed).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('falls back to retrieved facts when numeric facts are hallucinated', () => {
    const service = new KnowledgeAnswerGuardService()

    const answer = service.ensureAnswer(
      '基础版本为1911元/年，企业版本为4111元/年。',
      facts,
      '智能办公助手Pro怎么卖？',
    )

    expect(answer).toContain('1999元/年')
    expect(answer).toContain('4999元/年')
    expect(answer).not.toContain('1911元/年')
    expect(answer).not.toContain('4111元/年')
  })
})
