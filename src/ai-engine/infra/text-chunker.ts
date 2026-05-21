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

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
