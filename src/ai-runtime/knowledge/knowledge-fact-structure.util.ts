// 提供知识事实和回答事实共用的确定性结构化规则。
import { extractKnowledgeNumberTerms } from './knowledge-answer.util'
import { AnswerFact, KnowledgeFactType } from './knowledge.types'

const KNOWLEDGE_ROLE_MARKER_PATTERN = /^\s*(user|assistant|system)\s*$/i
const KNOWLEDGE_FACT_SPLIT_PATTERN = /[。；;]+/
const VERSION_VALUE_PATTERN = /\b(?:[A-Za-z]+[A-Za-z0-9]*[-_][A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)+|[vV]\d+(?:\.\d+)*|\d{4}版)\b/
const DURATION_TERM_PATTERN = /\d+(?:\.\d+)?\s*(?:个)?(?:工作日|天|日|周|个月|月|年|小时|分钟)[^,，.。:：;；、\n\r]*/
const POLICY_VALUE_PATTERN = /(不支持|不允许|不可以|禁止|支持|允许|可以|可申请)/
const SUBJECT_ATTRIBUTE_PATTERN = /^\s*([^：:\n]{1,40})[：:]\s*([^：:\n]+)\s*$/
const ATTRIBUTE_LABEL_PATTERN = /^(?:价格|售价|期限|版本|当前版本|服务期限)$/
const ATTRIBUTE_STATEMENT_PATTERN = /^\s*(价格|售价|期限|版本|当前版本|服务期限)\s*(?:为|是|支持|不支持|允许|不允许|可以|不可以|禁止|可申请)\s*(.+)\s*$/
const SUBJECT_ATTRIBUTE_LABEL_PATTERN = /^\s*(.{1,24}?)(价格|售价|期限|状态)\s*$/
const SUBJECT_WITH_ATTRIBUTE_PATTERN = /^\s*(.{1,24}?)(价格|售价|期限|状态)\s*(?:为|是|支持|不支持|允许|不允许|可以|不可以|禁止|可申请)\s*(.+)\s*$/
const GENERIC_STATEMENT_PATTERN = /^\s*(.{1,40}?)(?:为|是|支持|不支持|允许|不允许|可以|不可以|禁止|可申请)(.+)\s*$/

export type StructuredFactParts = {
  type: KnowledgeFactType
  subject?: string
  attribute?: string
  condition?: string
  value?: string
}

// 压缩知识或回答文本中的空行、角色模板和损坏字符。
export function compactFactContent(content: string) {
  const lines = content.replace(/\uFFFD/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line)
    .filter((line) => !KNOWLEDGE_ROLE_MARKER_PATTERN.test(line))

  return (lines.length ? lines : [content.trim()]).join('\n')
}

// 按稳定标点和多数字短句拆分可结构化的事实文本。
export function splitFactTexts(content: string) {
  return content
    .split(KNOWLEDGE_FACT_SPLIT_PATTERN)
    .flatMap((section) => splitSectionLines(section))
}

// 提取事实中必须保留的数字单位短语，兼容旧答案 Guard。
export function extractRequiredTerms(content: string) {
  return Array.from(new Set([
    ...extractKnowledgeNumberTerms(content),
  ].map((term) => term.trim()).filter(Boolean)))
}

// 基于通用文本形态提取事实类型、主体、属性和值。
export function buildStructuredFactParts(text: string): StructuredFactParts {
  const requiredTerms = extractRequiredTerms(text)
  const type = resolveFactType(text, requiredTerms)
  const value = extractFactValue(text, type, requiredTerms)
  const subjectAttribute = extractSubjectAttribute(text)

  return {
    type,
    subject: subjectAttribute.subject,
    attribute: subjectAttribute.attribute,
    value,
  }
}

// 从 AI 回答文本中保守提取结构化回答事实。
export function buildAnswerFacts(answer: string): AnswerFact[] {
  return splitFactTexts(compactFactContent(answer || ''))
    .map((text) => ({
      text,
      ...buildStructuredFactParts(text),
    }))
    .filter((fact) => fact.text)
}

// 归一化事实文本以支持轻量确定性文本对齐。
export function normalizeFactText(text = '') {
  return text
    .replace(/\uFFFD/g, '')
    .replace(/[，,。.;；:：、\s]+/g, '')
    .toLowerCase()
}

// 保留标签行和下一行内容的关系，避免字段名与字段值被拆散。
function splitSectionLines(section: string) {
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const facts: string[] = []

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const nextLine = lines[index + 1]
    if (isLabelLine(line) && nextLine && !isLabelLine(nextLine)) {
      facts.push(`${line}\n${nextLine}`)
      index++
    } else {
      facts.push(line)
    }
  }

  return facts
}

// 判断当前行是否是“字段名：”这类标签行。
function isLabelLine(line: string) {
  return /[:：]\s*$/.test(line)
}

// 判断当前行是否已经是“字段名：字段值”格式的完整事实。
function isLabeledValueLine(line: string) {
  return /^[^：:\n]{1,40}[：:]\s*[^：:\n]+$/.test(line)
}

// 按确定性从高到低识别事实类型，避免把版本或期限误判成普通数字。
function resolveFactType(text: string, requiredTerms: string[]): KnowledgeFactType {
  if (VERSION_VALUE_PATTERN.test(text)) return 'VERSION'
  if (requiredTerms.some((term) => DURATION_TERM_PATTERN.test(term))) return 'DURATION'
  if (requiredTerms.length) return 'NUMBER'
  if (POLICY_VALUE_PATTERN.test(text)) return 'POLICY'
  return 'TEXT'
}

// 从事实文本中提取当前类型最稳定的事实值。
function extractFactValue(text: string, type: KnowledgeFactType, requiredTerms: string[]) {
  if (type === 'VERSION') return text.match(VERSION_VALUE_PATTERN)?.[0]
  if (type === 'DURATION') return requiredTerms.find((term) => DURATION_TERM_PATTERN.test(term))
  if (type === 'NUMBER') return requiredTerms[0]
  if (type === 'POLICY') return text.match(POLICY_VALUE_PATTERN)?.[0]
  return undefined
}

// 只从冒号格式或通用谓词句里提取主体和属性候选，不维护业务词表。
function extractSubjectAttribute(text: string): Pick<StructuredFactParts, 'subject' | 'attribute'> {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const lastLine = lines[lines.length - 1]
  if (lastLine && lastLine !== text && isLabeledValueLine(lastLine)) {
    return extractSubjectAttribute(lastLine)
  }

  const labelMatch = text.match(SUBJECT_ATTRIBUTE_PATTERN)
  if (labelMatch) {
    const label = labelMatch[1].trim()
    if (isAttributeLabel(label)) {
      return { subject: undefined, attribute: label }
    }
    const subjectAttribute = splitSubjectAttributeLabel(label)
    return subjectAttribute || { subject: label, attribute: undefined }
  }

  const attributeStatementMatch = text.match(ATTRIBUTE_STATEMENT_PATTERN)
  if (attributeStatementMatch) {
    return { subject: undefined, attribute: attributeStatementMatch[1].trim() }
  }

  const subjectWithAttributeMatch = text.match(SUBJECT_WITH_ATTRIBUTE_PATTERN)
  if (subjectWithAttributeMatch) {
    return {
      subject: subjectWithAttributeMatch[1].trim(),
      attribute: subjectWithAttributeMatch[2].trim(),
    }
  }

  const statementMatch = text.match(GENERIC_STATEMENT_PATTERN)
  if (statementMatch) {
    return { subject: statementMatch[1].trim(), attribute: undefined }
  }

  return {}
}

// 判断标签是否表达通用属性而不是业务主体。
function isAttributeLabel(label: string) {
  return ATTRIBUTE_LABEL_PATTERN.test(label)
}

// 从“基础版价格”这类标签里拆出主体和属性。
function splitSubjectAttributeLabel(label: string) {
  const match = label.match(SUBJECT_ATTRIBUTE_LABEL_PATTERN)
  return match
    ? { subject: match[1].trim(), attribute: match[2].trim() }
    : undefined
}
