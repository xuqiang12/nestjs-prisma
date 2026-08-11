// 校验 AI 回答事实提取的保守结构化规则。
import { buildAnswerFacts } from 'src/ai-runtime/knowledge/knowledge-fact-structure.util'

describe('buildAnswerFacts', () => {
  it('extracts policy facts from plain answer text', () => {
    const [fact] = buildAnswerFacts('产品支持在线客服。')

    expect(fact).toMatchObject({
      text: '产品支持在线客服',
      type: 'POLICY',
      value: '支持',
    })
    expect(fact).not.toHaveProperty('requiredTerms')
    expect(fact).not.toHaveProperty('documentId')
    expect(fact).not.toHaveProperty('knowledgeBaseId')
    expect(fact).not.toHaveProperty('fileId')
    expect(fact).not.toHaveProperty('chunkIndex')
  })

  it('extracts number facts with value from answer text', () => {
    const [fact] = buildAnswerFacts('基础版价格为1999元/年。')

    expect(fact).toMatchObject({
      text: '基础版价格为1999元/年',
      type: 'NUMBER',
      value: '1999元/年',
    })
  })

  it('extracts version facts from answer text', () => {
    const [fact] = buildAnswerFacts('当前版本为 OA-Pro-2026。')

    expect(fact).toMatchObject({
      type: 'VERSION',
      value: 'OA-Pro-2026',
    })
  })

  it('extracts duration facts before generic number facts', () => {
    const [fact] = buildAnswerFacts('售后服务期限为7天。')

    expect(fact).toMatchObject({
      type: 'DURATION',
      value: '7天',
    })
  })

  it('keeps policy extraction deterministic without business keyword dictionaries', () => {
    const [fact] = buildAnswerFacts('企业版支持导出报表。')

    expect(fact).toMatchObject({
      type: 'POLICY',
      value: '支持',
    })
  })
})
