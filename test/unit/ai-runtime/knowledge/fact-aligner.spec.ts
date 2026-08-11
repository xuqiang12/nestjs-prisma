// 校验回答事实与知识库事实之间的候选对齐关系。
import { FactAligner } from 'src/ai-runtime/knowledge/fact-aligner'
import { AnswerFact, KnowledgeFact } from 'src/ai-runtime/knowledge/knowledge.types'

describe('FactAligner', () => {
  function knowledgeFact(overrides: Partial<KnowledgeFact>): KnowledgeFact {
    return {
      text: '基础版价格为1999元/年',
      type: 'NUMBER',
      requiredTerms: [],
      documentId: 'doc-1',
      ...overrides,
    }
  }

  it('aligns facts when subject, attribute and value match', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '基础版价格为1999元/年', type: 'NUMBER', subject: '基础版', attribute: '价格', value: '1999元/年' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ subject: '基础版', attribute: '价格', value: '1999元/年' }),
    ])

    expect(result.items).toHaveLength(1)
    expect(result.items[0].knowledgeFacts).toHaveLength(1)
    expect(result.items[0]).not.toHaveProperty('status')
  })

  it('keeps subject-conflicting candidates by attribute so verification can reject them', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '企业版价格为1999元/年', type: 'NUMBER', subject: '企业版', attribute: '价格', value: '1999元/年' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ subject: '基础版', attribute: '价格', value: '1999元/年' }),
    ])

    expect(result.items[0].knowledgeFacts).toHaveLength(1)
  })

  it('aligns attribute and value when both facts have no subject', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '价格为1999元/年', type: 'NUMBER', attribute: '价格', value: '1999元/年' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ text: '价格为1999元/年', subject: undefined, attribute: '价格', value: '1999元/年' }),
    ])

    expect(result.items[0].knowledgeFacts).toHaveLength(1)
  })

  it('does not align facts by value alone when subject and attribute are missing', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '企业版为1999元/年', type: 'NUMBER', value: '1999元/年' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ text: '基础版为1999元/年', subject: undefined, attribute: undefined, value: '1999元/年' }),
    ])

    expect(result.items[0].knowledgeFacts).toHaveLength(0)
  })

  it('aligns facts by subject and attribute without judging truth', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '基础版价格为3999元/年', type: 'NUMBER', subject: '基础版', attribute: '价格', value: '3999元/年' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ subject: '基础版', attribute: '价格', value: '1999元/年' }),
    ])

    expect(result.items[0].knowledgeFacts).toHaveLength(1)
  })

  it('aligns facts by normalized text', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '基础版价格为 1999 元/年', type: 'TEXT' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ text: '基础版价格为1999元/年。', type: 'TEXT', value: undefined }),
    ])

    expect(result.items[0].knowledgeFacts).toHaveLength(1)
  })

  it('returns an empty candidate list when no deterministic match exists', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '企业版价格为9999元/年', type: 'NUMBER', value: '9999元/年' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ text: '基础版价格为1999元/年', value: '1999元/年' }),
    ])

    expect(result.items[0]).toEqual({
      answerFact: answerFacts[0],
      knowledgeFacts: [],
    })
  })

  it('keeps every matched knowledge fact candidate', () => {
    const aligner = new FactAligner()
    const answerFacts: AnswerFact[] = [
      { text: '价格为1999元/年', type: 'NUMBER', attribute: '价格', value: '1999元/年' },
    ]

    const result = aligner.align(answerFacts, [
      knowledgeFact({ text: '价格为1999元/年', documentId: 'doc-1', subject: undefined, attribute: '价格', value: '1999元/年' }),
      knowledgeFact({ text: '价格为1999元/年', documentId: 'doc-2', subject: undefined, attribute: '价格', value: '1999元/年' }),
    ])

    expect(result.items[0].knowledgeFacts.map((fact) => fact.documentId)).toEqual(['doc-1', 'doc-2'])
  })
})
