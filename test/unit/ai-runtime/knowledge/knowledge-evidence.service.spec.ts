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

  it('builds structured text facts while keeping required terms compatible', () => {
    const service = new KnowledgeEvidenceService()

    const [fact] = service.buildFacts([
      {
        id: 'doc-text',
        content: '产品支持在线客服。',
      },
    ])

    expect(fact).toMatchObject({
      text: '产品支持在线客服',
      type: 'POLICY',
      value: '支持',
      requiredTerms: [],
      documentId: 'doc-text',
    })
  })

  it('builds structured number facts from generic numeric values', () => {
    const service = new KnowledgeEvidenceService()

    const [fact] = service.buildFacts([
      {
        id: 'doc-price',
        content: '基础版价格为1999元/年。',
      },
    ])

    expect(fact).toMatchObject({
      text: '基础版价格为1999元/年',
      type: 'NUMBER',
      value: '1999元/年',
      requiredTerms: ['1999元/年'],
    })
  })

  it('builds structured version facts from version-like values', () => {
    const service = new KnowledgeEvidenceService()

    const [fact] = service.buildFacts([
      {
        id: 'doc-version',
        content: '当前版本为 OA-Pro-2026。',
      },
    ])

    expect(fact).toMatchObject({
      type: 'VERSION',
      value: 'OA-Pro-2026',
    })
  })

  it('treats colon attribute labels as attributes instead of subjects', () => {
    const service = new KnowledgeEvidenceService()

    const facts = service.buildFacts([
      {
        id: 'doc-labels',
        content: '价格：1999元/年。当前版本：OA-Pro-2026。',
      },
    ])

    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: undefined, attribute: '价格', value: '1999元/年' }),
        expect.objectContaining({ subject: undefined, attribute: '当前版本', value: 'OA-Pro-2026' }),
      ]),
    )
  })

  it('builds structured duration facts before generic number facts', () => {
    const service = new KnowledgeEvidenceService()

    const [fact] = service.buildFacts([
      {
        id: 'doc-duration',
        content: '售后服务期限为7天。',
      },
    ])

    expect(fact).toMatchObject({
      type: 'DURATION',
      value: '7天',
      requiredTerms: ['7天'],
    })
  })

  it('maps search result source fields into structured facts', () => {
    const service = new KnowledgeEvidenceService()

    const evidence = service.buildEvidence([
      {
        id: 'doc-source',
        content: '审核通过后将在3个工作日内安排处理。',
        distance: 0.2,
        metadata: { filename: 'policy.md' },
        knowledgeBaseId: 'kb-1',
        fileId: 'file-1',
        chunkIndex: 3,
      } as any,
    ])
    const [fact] = evidence.facts

    expect(evidence.items[0]).toMatchObject({
      sourceId: 'doc-source',
      documentId: 'doc-source',
      knowledgeBaseId: 'kb-1',
      fileId: 'file-1',
      chunkIndex: 3,
    })
    expect(fact).toMatchObject({
      documentId: 'doc-source',
      knowledgeBaseId: 'kb-1',
      fileId: 'file-1',
      chunkIndex: 3,
      type: 'DURATION',
      value: '3个工作日内安排处理',
    })
  })
})
