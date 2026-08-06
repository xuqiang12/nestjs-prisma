// 校验和修正知识库答案中不被事实依据支持的数字结论。
import { Injectable } from '@nestjs/common'
import {
  buildKnowledgeFallbackAnswer,
  extractKnowledgeNumberTerms,
  validateKnowledgeAnswer,
} from './knowledge-answer.util'
import { KnowledgeFact, KnowledgeGuardResult } from './knowledge.types'

const STRICT_KNOWLEDGE_FALLBACK = '未找到相关制度。'
const COPIED_KNOWLEDGE_ARTIFACT_PATTERN = /(知识片段|事实依据|来源\d*[:：])/

@Injectable()
export class KnowledgeAnswerGuardService {
  // 校验答案中的数字事实是否都能在知识库事实中找到依据。
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

  // 在答案不可信时改用知识库事实生成安全兜底回答。
  ensureAnswer(content: string, facts: KnowledgeFact[], question = '') {
    const answer = this.sanitize(content)
    return this.validate(answer, facts).passed
      ? answer
      : buildKnowledgeFallbackAnswer(this.pickFallbackFacts(answer, facts), question, STRICT_KNOWLEDGE_FALLBACK)
  }

  // 清理答案中的损坏字符和复制出来的知识片段。
  sanitize(content: string) {
    return this.stripCopiedKnowledgeArtifacts(content.replace(/\uFFFD/g, '')).trim()
  }

  // 去除模型附带输出的来源或知识片段全文。
  private stripCopiedKnowledgeArtifacts(content: string) {
    const sections = content.split(/\n\s*(?:-{3,}|_{3,}|\*{3,})\s*\n/)
    if (sections.length <= 1) return content

    const copiedIndex = sections.findIndex((section, index) => index > 0 && COPIED_KNOWLEDGE_ARTIFACT_PATTERN.test(section))
    return copiedIndex > 0 ? sections.slice(0, copiedIndex).join('\n').trim() : content
  }

  // 优先选择与幻觉数字单位同类的事实作为兜底素材。
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

  // 把数字替换为占位符以比较“元/年”等单位结构。
  private numericUnitKey(term: string) {
    return term.replace(/\d+(?:\.\d+)?/g, '#').replace(/\s+/g, '')
  }
}
