// 校验知识库证据整理服务的事实拆分行为。
import { KnowledgeEvidenceService } from 'src/ai-runtime/knowledge/knowledge-evidence.service'

describe('KnowledgeEvidenceService', () => {
  it('keeps source content and atomic facts as separate evidence layers', () => {
    const service = new KnowledgeEvidenceService()

    const evidence = service.buildEvidence([
      {
        id: 'doc-1',
        distance: 0.2,
        content: '智能办公助手Pro基础版1999元/年；企业版4999元/年；购买后提供一年技术支持服务。',
      },
    ])

    expect(evidence.items[0].content).toBe(
      '智能办公助手Pro基础版1999元/年；企业版4999元/年；购买后提供一年技术支持服务。',
    )
    expect(evidence.facts.map((item) => item.text)).toEqual([
      '智能办公助手Pro基础版1999元/年',
      '企业版4999元/年',
      '购买后提供一年技术支持服务',
    ])
  })

  it('builds generic facts from source content without sample-specific filters', () => {
    const service = new KnowledgeEvidenceService()

    const facts = service.buildFacts([
      {
        id: 'doc-1',
        content: [
          '产品名称：智能办公助手Pro',
          '售价：',
          '基础版本：1999元/年',
          '企业版本：4999元/年',
          '购买后提供一年技术支持服务。',
        ].join('\n'),
      },
    ])
    const factText = facts.map((item) => item.text).join('\n')

    expect(factText).toContain('产品名称：智能办公助手Pro')
    expect(factText).toContain('基础版本：1999元/年')
    expect(factText).toContain('企业版本：4999元/年')
    expect(facts.flatMap((item) => item.requiredTerms)).toEqual(
      expect.arrayContaining(['1999元/年', '4999元/年']),
    )
  })
})
