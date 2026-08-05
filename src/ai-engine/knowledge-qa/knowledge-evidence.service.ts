import { Injectable } from '@nestjs/common'
import { extractKnowledgeNumberTerms } from '../knowledge-answer.util'
import { SearchResult } from '../vector/vector-store.service'
import { KnowledgeEvidenceItem } from './knowledge.types'

const KNOWLEDGE_EVIDENCE_MAX_LENGTH = 6000
const KNOWLEDGE_ROLE_MARKER_PATTERN = /^\s*(user|assistant|system)\s*$/i
const KNOWLEDGE_FACT_SPLIT_PATTERN = /[。；;]+/

@Injectable()
export class KnowledgeEvidenceService {
  buildEvidence(sources: SearchResult[]) {
    const items = sources
      .map((source, index) => ({
        sourceId: source.id || `source-${index + 1}`,
        content: this.compactContent(source.content),
        distance: source.distance,
        metadata: source.metadata,
      }))
      .filter((item) => item.content)

    return {
      sources,
      items,
      facts: this.buildFacts(items),
    }
  }

  buildFacts(sources: Array<{ content?: string; [key: string]: unknown }>) {
    return sources
      .flatMap((source) => this.splitFactTexts(this.compactContent(source.content || '')))
      .map((text) => ({
        text,
        requiredTerms: this.extractRequiredTerms(text),
      }))
      .filter((fact) => fact.text)
  }

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

  private compactContent(content: string) {
    const lines = content.replace(/\uFFFD/g, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line)
      .filter((line) => !KNOWLEDGE_ROLE_MARKER_PATTERN.test(line))

    return (lines.length ? lines : [content.trim()]).join('\n')
  }

  private splitFactTexts(content: string) {
    return content
      .split(KNOWLEDGE_FACT_SPLIT_PATTERN)
      .flatMap((section) => this.splitSectionLines(section))
  }

  private splitSectionLines(section: string) {
    const lines = section
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const facts: string[] = []

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      const nextLine = lines[index + 1]
      if (this.isLabelLine(line) && nextLine && !this.isLabelLine(nextLine)) {
        facts.push(`${line}\n${nextLine}`)
        index++
      } else {
        facts.push(line)
      }
    }

    return facts
  }

  private isLabelLine(line: string) {
    return /[:：]\s*$/.test(line)
  }

  private extractRequiredTerms(content: string) {
    return Array.from(new Set([
      ...extractKnowledgeNumberTerms(content),
    ].map((term) => term.trim()).filter(Boolean)))
  }
}
