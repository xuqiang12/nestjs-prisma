/**
 * 文本分块服务 - 将长文本切分为适合向量数据库的 chunks
 *
 * 处理策略：
 * 1. 文本标准化（清理换行/空行）
 * 2. 按段落切分（保持语义结构）
 * 3. 按 maxSize 控制 chunk 大小
 * 4. 使用 overlap 让 chunk 之间有上下文重叠
 */

type ChunkOptions = {
  maxSize?: number
  overlap?: number
}
export function splitText(text: string, options: ChunkOptions = {}) {
  const maxSize = options.maxSize ?? 500
  const overlap = options.overlap ?? 100

  const normalized = normalizeText(text)

  const paragraphs = normalized.split('\n')

  const chunks: string[] = []

  let buffer = ''

  for (const p of paragraphs) {
    const trimmed = p.trim()

    if (!trimmed) continue

    if ((buffer + '\n' + trimmed).length > maxSize) {
      if (buffer) chunks.push(buffer)

      buffer = trimmed
    } else {
      buffer += (buffer ? '\n' : '') + trimmed
    }
  }

  if (buffer) chunks.push(buffer)

  return applyOverlap(chunks, overlap)
}

/**
 * overlap 处理（滑动窗口）
 * 将上一 chunk 的尾部内容拼接到当前 chunk，保持语义连续性
 */
function applyOverlap(chunks: string[], overlap: number) {
  const result: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const current = chunks[i]

    if (i === 0) {
      result.push(current)
      continue
    }

    const prev = result[result.length - 1]

    const prefix = prev.slice(-overlap)

    const merged = prefix + '\n' + current

    result.push(merged)
  }

  return result
}

/**
 * 文本标准化处理
 * 统一换行符、压缩多余空行、去掉首尾空白
 */
function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
