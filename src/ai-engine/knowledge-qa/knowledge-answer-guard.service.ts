import { Injectable } from '@nestjs/common'
import {
  buildKnowledgeFallbackAnswer,
  extractKnowledgeNumberTerms,
  validateKnowledgeAnswer,
} from '../knowledge-answer.util'
import { KnowledgeFact, KnowledgeGuardResult } from './knowledge.types'

const STRICT_KNOWLEDGE_FALLBACK = '未找到相关制度。'
const COPIED_KNOWLEDGE_ARTIFACT_PATTERN = /(知识片段|事实依据|来源\d*[:：])/

@Injectable()
export class KnowledgeAnswerGuardService {
  validate(content: string, facts: KnowledgeFact[]): KnowledgeGuardResult {
    const answer = this.sanitize(content)
    const passed = validateKnowledgeAnswer(answer, facts)
    return {
      passed,
      errors: passed
        ? []
        : [{ code: 'UNSUPPORTED_NUMERIC_FACT', message: '答案包含知识库事实中不存在的关键数字。' }],
    }
  }

  ensureAnswer(content: string, facts: KnowledgeFact[], question = '') {
    const answer = this.sanitize(content)
    return this.validate(answer, facts).passed
      ? answer
      : buildKnowledgeFallbackAnswer(this.pickFallbackFacts(answer, facts), question, STRICT_KNOWLEDGE_FALLBACK)
  }

  sanitize(content: string) {
    return this.stripCopiedKnowledgeArtifacts(content.replace(/\uFFFD/g, '')).trim()
  }

  private stripCopiedKnowledgeArtifacts(content: string) {
    const sections = content.split(/\n\s*(?:-{3,}|_{3,}|\*{3,})\s*\n/)
    if (sections.length <= 1) return content

    const copiedIndex = sections.findIndex((section, index) => index > 0 && COPIED_KNOWLEDGE_ARTIFACT_PATTERN.test(section))
    return copiedIndex > 0 ? sections.slice(0, copiedIndex).join('\n').trim() : content
  }

  private pickFallbackFacts(answer: string, facts: KnowledgeFact[]) {
    const factTerms = new Set(facts.flatMap((fact) => fact.requiredTerms))
    const unsupportedKeys = new Set(
      extractKnowledgeNumberTerms(answer)
        .filter((term) => !factTerms.has(term))
        .map((term) => this.numericUnitKey(term))
        .filter((key) => key !== '#'),
    )
    const focusedFacts = facts.filter((fact) => (
      fact.requiredTerms.some((term) => unsupportedKeys.has(this.numericUnitKey(term)))
    ))

    return focusedFacts.length ? focusedFacts : facts
  }

  private numericUnitKey(term: string) {
    return term.replace(/\d+(?:\.\d+)?/g, '#').replace(/\s+/g, '')
  }
}
