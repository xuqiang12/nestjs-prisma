type ChunkOptions = {
  maxSize?: number
  overlap?: number
}

// 按段落把长文本拆成适合向量化的小片段，并保留相邻片段的重叠上下文。
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

// 给相邻切片补充重叠尾部，减少知识片段边界导致的上下文丢失。
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

// 统一换行格式并压缩过多空行，保证后续按段落切片更稳定。
function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
