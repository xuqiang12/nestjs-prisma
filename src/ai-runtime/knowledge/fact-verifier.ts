// 根据已对齐的回答事实和知识事实判断确定性的事实支持状态。
import { normalizeFactText } from './knowledge-fact-structure.util'
import {
  FactAlignment,
  FactVerificationResult,
  FactVerificationStatus,
  FactVerificationSummary,
  KnowledgeFact,
} from './knowledge.types'

export class FactVerifier {
  // 验证每个已对齐事实的支持状态，不重新提取、不重新对齐、不修改答案。
  verify(alignments: FactAlignment[]): FactVerificationSummary {
    return {
      items: alignments.map((alignment) => this.verifyAlignment(alignment)),
    }
  }

  // 按 NOT_FOUND、主体冲突、结构化值、文本一致和无法判断的顺序生成验证结果。
  private verifyAlignment(alignment: FactAlignment): FactVerificationResult {
    const { answerFact, knowledgeFacts } = alignment
    const status = this.resolveStatus(alignment)

    return {
      answerFact,
      status,
      knowledgeFacts,
    }
  }

  // 根据当前候选知识事实判断回答事实状态。
  private resolveStatus(alignment: FactAlignment): FactVerificationStatus {
    const { answerFact, knowledgeFacts } = alignment
    if (!knowledgeFacts.length) return 'NOT_FOUND'

    const comparableFacts = knowledgeFacts.filter((fact) => this.hasSameSubjectAttribute(answerFact, fact))
    if (answerFact.subject && answerFact.attribute && answerFact.value && comparableFacts.length) {
      const values = new Set(comparableFacts
        .map((fact) => this.normalizeValue(fact.value))
        .filter(Boolean))
      if (values.size > 1) return 'UNCERTAIN'
      if (values.size === 1) {
        return values.has(this.normalizeValue(answerFact.value))
          ? 'SUPPORTED'
          : 'CONTRADICTED'
      }
    }
    if (answerFact.subject && answerFact.attribute && !answerFact.value && comparableFacts.length) {
      return 'UNCERTAIN'
    }

    const sameSubjectFacts = knowledgeFacts.filter((fact) => this.hasSameSubject(answerFact, fact))
    if (answerFact.subject && answerFact.value && sameSubjectFacts.length) {
      const values = new Set(sameSubjectFacts
        .map((fact) => this.normalizeValue(fact.value))
        .filter(Boolean))
      if (values.size > 1) return 'UNCERTAIN'
      if (values.size === 1) {
        return values.has(this.normalizeValue(answerFact.value))
          ? 'SUPPORTED'
          : 'CONTRADICTED'
      }
    }

    if (knowledgeFacts.some((fact) => this.hasDifferentSubject(answerFact, fact))) {
      return 'CONTRADICTED'
    }

    if (!answerFact.subject
      && answerFact.attribute
      && answerFact.value
      && knowledgeFacts.some((fact) => !fact.subject
        && this.sameAttribute(answerFact.attribute, fact.attribute)
        && this.sameValue(answerFact.value, fact.value))) {
      return 'SUPPORTED'
    }
    if (knowledgeFacts.length === 1 && this.sameText(answerFact.text, knowledgeFacts[0].text)) {
      return 'SUPPORTED'
    }
    return 'UNCERTAIN'
  }

  // 判断主体和属性是否都存在且归一化后一致。
  private hasSameSubjectAttribute(answerFact: FactAlignment['answerFact'], knowledgeFact: KnowledgeFact) {
    return !!answerFact.subject
      && !!answerFact.attribute
      && !!knowledgeFact.subject
      && !!knowledgeFact.attribute
      && normalizeFactText(answerFact.subject) === normalizeFactText(knowledgeFact.subject)
      && normalizeFactText(answerFact.attribute) === normalizeFactText(knowledgeFact.attribute)
  }

  // 判断主体是否都存在且归一化后一致。
  private hasSameSubject(answerFact: FactAlignment['answerFact'], knowledgeFact: KnowledgeFact) {
    return !!answerFact.subject
      && !!knowledgeFact.subject
      && normalizeFactText(answerFact.subject) === normalizeFactText(knowledgeFact.subject)
  }

  // 判断候选事实是否与回答事实存在明确主体冲突。
  private hasDifferentSubject(answerFact: FactAlignment['answerFact'], knowledgeFact: KnowledgeFact) {
    return !!answerFact.subject
      && !!knowledgeFact.subject
      && normalizeFactText(answerFact.subject) !== normalizeFactText(knowledgeFact.subject)
  }

  // 判断两个事实属性是否经过轻量归一化后一致。
  private sameAttribute(answerAttribute?: string, knowledgeAttribute?: string) {
    return !!answerAttribute && !!knowledgeAttribute && normalizeFactText(answerAttribute) === normalizeFactText(knowledgeAttribute)
  }

  // 判断两个事实值是否经过轻量归一化后一致。
  private sameValue(answerValue?: string, knowledgeValue?: string) {
    return !!answerValue && !!knowledgeValue && this.normalizeValue(answerValue) === this.normalizeValue(knowledgeValue)
  }

  // 判断两个事实文本是否经过轻量归一化后一致。
  private sameText(answerText: string, knowledgeText: string) {
    return normalizeFactText(answerText) === normalizeFactText(knowledgeText)
  }

  // 归一化事实值，避免空格、标点和大小写造成误差。
  private normalizeValue(value?: string) {
    return value ? normalizeFactText(value) : ''
  }
}
