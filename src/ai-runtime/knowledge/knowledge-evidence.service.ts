// 整理知识库召回来源、提示词证据和可校验的事实项。
import { Injectable } from '@nestjs/common'
import { extractKnowledgeNumberTerms } from './knowledge-answer.util'
import { SearchResult } from '../vector/vector-store.service'
import { KnowledgeEvidenceItem } from './knowledge.types'

const KNOWLEDGE_EVIDENCE_MAX_LENGTH = 6000
const KNOWLEDGE_ROLE_MARKER_PATTERN = /^\s*(user|assistant|system)\s*$/i
const KNOWLEDGE_FACT_SPLIT_PATTERN = /[。；;]+/

@Injectable()
export class KnowledgeEvidenceService {
  // 将召回结果拆成原始来源、提示词证据和事实校验项三层结构。
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

  // 从知识片段中抽取可被答案 Guard 使用的原子事实。
  buildFacts(sources: Array<{ content?: string; [key: string]: unknown }>) {
    return sources
      .flatMap((source) => this.splitFactTexts(this.compactContent(source.content || '')))
      .map((text) => ({
        text,
        requiredTerms: this.extractRequiredTerms(text),
      }))
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

  // 压缩知识内容中的空行、角色模板和损坏字符。
  private compactContent(content: string) {
    const lines = content.replace(/\uFFFD/g, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line)
      .filter((line) => !KNOWLEDGE_ROLE_MARKER_PATTERN.test(line))

    return (lines.length ? lines : [content.trim()]).join('\n')
  }

  // 按常见中文标点把知识片段拆成事实句。
  private splitFactTexts(content: string) {
    return content
      .split(KNOWLEDGE_FACT_SPLIT_PATTERN)
      .flatMap((section) => this.splitSectionLines(section))
  }

  // 保留标签行和下一行内容的关系，避免字段名与字段值被拆散。
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

  // 判断当前行是否是“字段名：”这类标签行。
  private isLabelLine(line: string) {
    return /[:：]\s*$/.test(line)
  }

  // 提取事实中必须被答案保留的数字单位短语。
  private extractRequiredTerms(content: string) {
    return Array.from(new Set([
      ...extractKnowledgeNumberTerms(content),
    ].map((term) => term.trim()).filter(Boolean)))
  }
}
