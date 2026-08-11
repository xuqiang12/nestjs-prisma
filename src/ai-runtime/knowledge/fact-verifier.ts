// 根据已对齐的回答事实和知识事实判断确定性的事实支持状态。
import { normalizeFactText } from './knowledge-fact-structure.util'
import {
  FactAlignment,
  FactVerificationResult,
  FactVerificationStatus,
  FactVerificationSummary,
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

    // 预先归一化回答事实字段，后续只在双方字段都明确存在时参与比较。
    const answerSubject = answerFact.subject ? normalizeFactText(answerFact.subject) : ''
    const answerAttribute = answerFact.attribute ? normalizeFactText(answerFact.attribute) : ''
    const answerValue = answerFact.value ? normalizeFactText(answerFact.value) : ''
    // 对齐轻量归一化后一致的完整事实文本。
    const sameText = knowledgeFacts.length === 1
      && normalizeFactText(answerFact.text) === normalizeFactText(knowledgeFacts[0].text)

    // 找出主体和属性都存在且归一化后一致的候选事实。
    const comparableFacts = knowledgeFacts.filter((fact) => !!answerFact.subject
      && !!answerFact.attribute
      && !!fact.subject
      && !!fact.attribute
      && answerSubject === normalizeFactText(fact.subject)
      && answerAttribute === normalizeFactText(fact.attribute))
    if (answerFact.subject && answerFact.attribute && answerFact.value && comparableFacts.length) {
      const values = new Set(comparableFacts
        .map((fact) => fact.value ? normalizeFactText(fact.value) : '')
        .filter(Boolean))
      if (values.size > 1) return 'UNCERTAIN'
      if (values.size === 1) {
        return values.has(answerValue)
          ? 'SUPPORTED'
          : 'CONTRADICTED'
      }
    }
    if (answerFact.subject && answerFact.attribute && !answerFact.value && comparableFacts.length) {
      return 'UNCERTAIN'
    }

    // 找出主体都存在且归一化后一致的候选事实。
    const sameSubjectFacts = knowledgeFacts.filter((fact) => !!answerFact.subject
      && !!fact.subject
      && answerSubject === normalizeFactText(fact.subject))
    if (answerFact.subject && answerFact.value && sameSubjectFacts.length) {
      const values = new Set(sameSubjectFacts
        .map((fact) => fact.value ? normalizeFactText(fact.value) : '')
        .filter(Boolean))
      if (values.size > 1) return 'UNCERTAIN'
      if (values.size === 1) {
        return values.has(answerValue)
          ? 'SUPPORTED'
          : 'CONTRADICTED'
      }
    }

    // 判断候选事实是否与回答事实存在明确主体冲突。
    if (knowledgeFacts.some((fact) => !!answerFact.subject
      && !!fact.subject
      && answerSubject !== normalizeFactText(fact.subject))) {
      return 'CONTRADICTED'
    }

    if (!answerFact.subject
      && answerFact.attribute
      && answerFact.value
      && knowledgeFacts.some((fact) => !fact.subject
        && !!fact.attribute
        && !!fact.value
        // 无主体事实只在属性和值都明确一致时判定支持。
        && answerAttribute === normalizeFactText(fact.attribute)
        && answerValue === normalizeFactText(fact.value))) {
      return 'SUPPORTED'
    }
    if (sameText) {
      return 'SUPPORTED'
    }
    return 'UNCERTAIN'
  }
}
