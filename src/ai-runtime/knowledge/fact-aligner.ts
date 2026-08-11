// 建立回答事实与当前知识库事实之间的候选对应关系。
import { normalizeFactText } from './knowledge-fact-structure.util'
import { AnswerFact, FactAlignmentResult, KnowledgeFact } from './knowledge.types'

export class FactAligner {
  // 将每个 AnswerFact 对齐到当前已有 KnowledgeFact 候选，不判断事实真假。
  align(answerFacts: AnswerFact[], knowledgeFacts: KnowledgeFact[]): FactAlignmentResult {
    return {
      items: answerFacts.map((answerFact) => ({
        answerFact,
        knowledgeFacts: knowledgeFacts.filter((knowledgeFact) => this.isCandidate(answerFact, knowledgeFact)),
      })),
    }
  }

  // 按主体优先的规则寻找候选事实，避免相同数值跨主体误对齐。
  private isCandidate(answerFact: AnswerFact, knowledgeFact: KnowledgeFact) {
    const sameSubject = !!answerFact.subject
      && !!knowledgeFact.subject
      && normalizeFactText(answerFact.subject) === normalizeFactText(knowledgeFact.subject)
    const sameAttribute = !!answerFact.attribute
      && !!knowledgeFact.attribute
      && normalizeFactText(answerFact.attribute) === normalizeFactText(knowledgeFact.attribute)
    const sameValue = !!answerFact.value
      && !!knowledgeFact.value
      && normalizeFactText(answerFact.value) === normalizeFactText(knowledgeFact.value)
    const sameCondition = !!answerFact.condition
      && !!knowledgeFact.condition
      && normalizeFactText(answerFact.condition) === normalizeFactText(knowledgeFact.condition)
    const sameText = normalizeFactText(answerFact.text) === normalizeFactText(knowledgeFact.text)

    if (answerFact.subject && knowledgeFact.subject) {
      return sameSubject
        ? true
        : sameAttribute && sameValue
    }

    if (!answerFact.subject && !knowledgeFact.subject) {
      if (sameAttribute && sameValue) {
        return true
      }
      if (sameCondition) return true
    }

    return sameText
  }
}
