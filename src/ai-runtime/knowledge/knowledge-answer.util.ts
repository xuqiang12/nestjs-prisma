// 提供知识库答案数字事实校验和事实兜底文本构建工具。
export type KnowledgeAnswerFact = {
  text: string
  requiredTerms: string[]
}

const KNOWLEDGE_NUMBER_PATTERN = /\d+(?:\.\d+)?/g
const KNOWLEDGE_TERM_BOUNDARY_PATTERN = /[\s,，.。:：;；、\n\r]/

// 从文本中提取带单位或后缀的数字短语。
export function extractKnowledgeNumberTerms(content: string) {
  const terms: string[] = []
  for (const match of content.matchAll(KNOWLEDGE_NUMBER_PATTERN)) {
    const start = match.index || 0
    let end = start + match[0].length
    while (
      end < content.length &&
      !KNOWLEDGE_TERM_BOUNDARY_PATTERN.test(content[end]) &&
      end - start < 18
    ) {
      end++
    }
    const term = content.slice(start, end).trim()
    if (term && term !== match[0]) {
      terms.push(term)
    }
  }
  return Array.from(new Set(terms))
}

// 校验答案中的数字短语是否都来自知识库事实。
export function validateKnowledgeAnswer(answer: string, facts: KnowledgeAnswerFact[]) {
  if (!answer) return !facts.length
  const answerNumberTerms = extractKnowledgeNumberTerms(answer)
  if (!answerNumberTerms.length) return true

  const factNumberTerms = new Set(
    facts
      .flatMap((fact) => extractKnowledgeNumberTerms(fact.text))
      .map((term) => normalizeKnowledgeTerm(term)),
  )
  if (!factNumberTerms.size) return true

  return answerNumberTerms.every((term) => factNumberTerms.has(normalizeKnowledgeTerm(term)))
}

// 根据知识库事实构建通用兜底回答。
export function buildKnowledgeFallbackAnswer(
  facts: KnowledgeAnswerFact[],
  question = '',
  fallback = '未找到相关制度。',
) {
  const factLines = flattenKnowledgeFactLines(facts)
  if (!factLines.length) return fallback
  return ['根据知识库，相关信息如下：', '', ...factLines].join('\n')
}

// 将事实项拆成去重后的可读行。
function flattenKnowledgeFactLines(facts: KnowledgeAnswerFact[]) {
  const lines: string[] = []
  for (const fact of facts) {
    for (const line of fact.text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed && !lines.includes(trimmed)) {
        lines.push(trimmed)
      }
    }
  }
  return lines
}

// 归一化知识数字短语，避免空白字符影响匹配。
function normalizeKnowledgeTerm(content: string) {
  return content.replace(/\s+/g, '')
}
