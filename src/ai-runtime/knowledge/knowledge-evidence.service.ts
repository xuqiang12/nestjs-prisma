// 整理知识库召回来源、提示词证据和可校验的事实项。
import { Injectable } from '@nestjs/common'
import { SearchResult } from '../vector/vector-store.service'
import { KnowledgeEvidenceItem, KnowledgeFact } from './knowledge.types'
import {
  buildStructuredFactParts,
  compactFactContent,
  extractRequiredTerms,
  splitFactTexts,
} from './knowledge-fact-structure.util'

const KNOWLEDGE_EVIDENCE_MAX_LENGTH = 6000

type KnowledgeFactSource = {
  id?: string
  sourceId?: string
  content?: string
  metadata?: Record<string, any>
  distance?: number
  knowledgeBaseId?: string | null
  fileId?: string | null
  chunkIndex?: number | null
  documentId?: string | null
}

@Injectable()
export class KnowledgeEvidenceService {
  // 将召回结果拆成原始来源、提示词证据和事实校验项三层结构。
  buildEvidence(sources: SearchResult[]) {
    const items = sources
      .map((source, index) => ({
        sourceId: source.id || `source-${index + 1}`,
        content: compactFactContent(source.content),
        distance: source.distance,
        metadata: source.metadata,
        documentId: source.id,
        knowledgeBaseId: this.pickSourceString(source, 'knowledgeBaseId'),
        fileId: this.pickSourceString(source, 'fileId'),
        chunkIndex: this.pickSourceNumber(source, 'chunkIndex'),
      }))
      .filter((item) => item.content)

    return {
      sources,
      items,
      facts: this.buildFacts(items),
    }
  }

  // 从知识片段中抽取可被答案 Guard 使用的原子事实。
  buildFacts(sources: KnowledgeFactSource[]): KnowledgeFact[] {
    return sources
      .flatMap((source) => splitFactTexts(compactFactContent(source.content || ''))
        .map((text) => this.buildFact(text, source)))
      .filter((fact) => fact.text)
  }

  // 将证据项拼成模型提示词使用的事实依据文本。
  buildPromptEvidence(items: KnowledgeEvidenceItem[]) {
    const evidence = items
      .map((item, index) => {
        return `证据${index + 1}：${item.content}`
      })
      .join('\n')

    return evidence.length > KNOWLEDGE_EVIDENCE_MAX_LENGTH
      ? `${evidence.slice(0, KNOWLEDGE_EVIDENCE_MAX_LENGTH)}...`
      : evidence
  }

  // 基于通用文本形态构造结构化事实，同时保留旧 Guard 依赖的 requiredTerms。
  private buildFact(text: string, source: KnowledgeFactSource): KnowledgeFact {
    const requiredTerms = extractRequiredTerms(text)
    const structured = buildStructuredFactParts(text)

    return {
      text,
      ...structured,
      requiredTerms,
      documentId: this.pickSourceString(source, 'documentId') || this.pickSourceString(source, 'id') || this.pickSourceString(source, 'sourceId'),
      knowledgeBaseId: this.pickSourceString(source, 'knowledgeBaseId'),
      fileId: this.pickSourceString(source, 'fileId'),
      chunkIndex: this.pickSourceNumber(source, 'chunkIndex'),
    }
  }

  // 从召回结果根字段或 metadata 中读取字符串来源字段。
  private pickSourceString(source: KnowledgeFactSource, key: keyof KnowledgeFactSource) {
    const directValue = source[key]
    if (typeof directValue === 'string' && directValue.trim()) {
      return directValue.trim()
    }
    const metadataValue = source.metadata?.[key]
    return typeof metadataValue === 'string' && metadataValue.trim()
      ? metadataValue.trim()
      : undefined
  }

  // 从召回结果根字段或 metadata 中读取数字来源字段。
  private pickSourceNumber(source: KnowledgeFactSource, key: keyof KnowledgeFactSource) {
    const directValue = source[key]
    if (typeof directValue === 'number') return directValue
    const metadataValue = source.metadata?.[key]
    return typeof metadataValue === 'number' ? metadataValue : undefined
  }
}
