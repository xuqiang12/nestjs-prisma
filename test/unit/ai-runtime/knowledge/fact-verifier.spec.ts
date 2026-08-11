// 校验事实验证器只基于已对齐候选判断支持状态。
import { FactVerifier } from 'src/ai-runtime/knowledge/fact-verifier'
import { AnswerFact, FactAlignment, KnowledgeFact } from 'src/ai-runtime/knowledge/knowledge.types'

describe('FactVerifier', () => {
  function answerFact(overrides: Partial<AnswerFact>): AnswerFact {
    return {
      text: '基础版价格为1999元/年',
      type: 'NUMBER',
      subject: '基础版',
      attribute: '价格',
      value: '1999元/年',
      ...overrides,
    }
  }

  function knowledgeFact(overrides: Partial<KnowledgeFact>): KnowledgeFact {
    return {
      text: '基础版价格为1999元/年',
      type: 'NUMBER',
      subject: '基础版',
      attribute: '价格',
      value: '1999元/年',
      requiredTerms: [],
      documentId: 'doc-1',
      ...overrides,
    }
  }

  function verifyOne(alignment: FactAlignment) {
    return new FactVerifier().verify([alignment]).items[0]
  }

  it('marks aligned structured facts as supported when subject, attribute and value match', () => {
    const result = verifyOne({
      answerFact: answerFact({}),
      knowledgeFacts: [knowledgeFact({})],
    })

    expect(result.status).toBe('SUPPORTED')
    expect(result.knowledgeFacts).toHaveLength(1)
  })

  it('marks structured facts as contradicted only when subject and attribute match but value differs', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '基础版价格为2999元/年', value: '2999元/年' }),
      knowledgeFacts: [knowledgeFact({ value: '1999元/年' })],
    })

    expect(result.status).toBe('CONTRADICTED')
  })

  it('does not support facts when subject differs even if value matches', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '企业版价格为1999元/年', subject: '企业版', value: '1999元/年' }),
      knowledgeFacts: [knowledgeFact({ subject: '基础版', attribute: '价格', value: '1999元/年' })],
    })

    expect(result.status).toBe('CONTRADICTED')
  })

  it('supports attribute and value matches when both facts have no subject', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '价格为1999元/年', subject: undefined, attribute: '价格', value: '1999元/年' }),
      knowledgeFacts: [knowledgeFact({ text: '价格为1999元/年', subject: undefined, attribute: '价格', value: '1999元/年' })],
    })

    expect(result.status).toBe('SUPPORTED')
  })

  it('does not support facts when subject and value both differ', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '企业版价格为2999元/年', subject: '企业版', value: '2999元/年' }),
      knowledgeFacts: [knowledgeFact({ subject: '基础版', attribute: '价格', value: '1999元/年' })],
    })

    expect(result.status).toBe('CONTRADICTED')
  })

  it('marks facts without aligned knowledge candidates as not found', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '企业版价格为9999元/年', value: '9999元/年' }),
      knowledgeFacts: [],
    })

    expect(result.status).toBe('NOT_FOUND')
  })

  it('marks normalized text facts as supported when text is exactly aligned after normalization', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '产品支持在线客服。', type: 'TEXT', subject: undefined, attribute: undefined, value: undefined }),
      knowledgeFacts: [
        knowledgeFact({ text: '产品支持在线客服。', type: 'TEXT', subject: undefined, attribute: undefined, value: undefined }),
      ],
    })

    expect(result.status).toBe('SUPPORTED')
  })

  it('marks facts as supported when value text only differs by lightweight normalization', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '基础版价格为 1999 元/年', value: '1999 元/年' }),
      knowledgeFacts: [knowledgeFact({ text: '基础版价格为1999元/年。', value: '1999元/年' })],
    })

    expect(result.status).toBe('SUPPORTED')
  })

  it('marks incomplete structured candidates as uncertain instead of forcing support or contradiction', () => {
    const result = verifyOne({
      answerFact: answerFact({ value: undefined }),
      knowledgeFacts: [knowledgeFact({ value: '1999元/年' })],
    })

    expect(result.status).toBe('UNCERTAIN')
  })

  it('marks multiple matching sources as supported when all structured values agree', () => {
    const result = verifyOne({
      answerFact: answerFact({}),
      knowledgeFacts: [
        knowledgeFact({ documentId: 'doc-1', value: '1999元/年' }),
        knowledgeFact({ documentId: 'doc-2', value: '1999 元/年' }),
      ],
    })

    expect(result.status).toBe('SUPPORTED')
  })

  it('marks multiple structured sources with different values as uncertain without source conflict status', () => {
    const result = verifyOne({
      answerFact: answerFact({}),
      knowledgeFacts: [
        knowledgeFact({ documentId: 'doc-1', value: '1999元/年' }),
        knowledgeFact({ documentId: 'doc-2', value: '2999元/年' }),
      ],
    })

    expect(result.status).toBe('UNCERTAIN')
  })

  it('marks multiple text candidates as uncertain when structured fields cannot decide', () => {
    const result = verifyOne({
      answerFact: answerFact({ text: '产品提供在线客服服务', type: 'TEXT', subject: undefined, attribute: undefined, value: undefined }),
      knowledgeFacts: [
        knowledgeFact({ text: '产品支持在线客服。', type: 'TEXT', subject: undefined, attribute: undefined, value: undefined }),
        knowledgeFact({ text: '产品提供人工客服。', type: 'TEXT', subject: undefined, attribute: undefined, value: undefined }),
      ],
    })

    expect(result.status).toBe('UNCERTAIN')
  })
})
