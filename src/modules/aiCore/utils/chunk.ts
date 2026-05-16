/**
 * 分块配置参数
 */
export interface SplitOptions {
  /** 每个 chunk 的最大字符数（近似控制） */
  maxSize?: number

  /** chunk 之间重叠的字符数（用于保持上下文连续性） */
  overlap?: number
}

/**
 * 主函数：将文本切分为适合向量数据库的 chunks
 *
 * 策略：
 * 1. 文本标准化（方案三：清理换行/空行）
 * 2. 按段落切分（保持语义结构）
 * 3. 按 maxSize 控制 chunk 大小
 * 4. 使用 overlap 让 chunk 之间有上下文重叠
 */
export function splitText(text: string, options: SplitOptions = {}) {
  const maxSize = options.maxSize ?? 500
  const overlap = options.overlap ?? 100

  // 1️⃣ 文本预处理（统一格式 + 清理噪声）
  const normalized = normalizeText(text)

  // 2️⃣ 按换行切成“段落级别”
  const paragraphs = normalized.split('\n')

  const chunks: string[] = []

  let buffer = '' // 当前正在构建的 chunk

  for (const p of paragraphs) {
    const trimmed = p.trim()

    // 跳过空行
    if (!trimmed) continue

    /**
     * 如果当前 buffer 加上这一段会超过 maxSize
     * 就先把 buffer 存入 chunks，然后重新开始
     */
    if ((buffer + '\n' + trimmed).length > maxSize) {
      if (buffer) chunks.push(buffer)

      buffer = trimmed
    } else {
      // 否则继续拼接当前 chunk
      buffer += (buffer ? '\n' : '') + trimmed
    }
  }

  // 把最后剩余内容加入 chunks
  if (buffer) chunks.push(buffer)

  // 3️⃣ 对 chunks 做 overlap 处理（滑动窗口）
  return applyOverlap(chunks, overlap)
}

/**
 * overlap 处理（滑动窗口）
 *
 * 核心思想：
 * - 当前 chunk 会包含上一 chunk 的尾部内容
 * - 用于增强语义连续性，提高 embedding 命中率
 */
function applyOverlap(chunks: string[], overlap: number) {
  const result: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const current = chunks[i]

    // 第一个 chunk 不需要 overlap
    if (i === 0) {
      result.push(current)
      continue
    }

    const prev = result[result.length - 1]

    // 取上一 chunk 的尾部 overlap 字符
    const prefix = prev.slice(-overlap)

    /**
     * 将上一段尾部 + 当前 chunk 拼接
     * 形成“带上下文的 chunk”
     */
    const merged = prefix + '\n' + current

    result.push(merged)
  }

  return result
}

/**
 * 文本标准化（方案三核心）
 *
 * 作用：
 * - 统一换行符（Windows / Linux）
 * - 压缩多余空行
 * - 去掉首尾空白
 */
function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, '\n') // Windows 换行统一
    .replace(/\n{3,}/g, '\n\n') // 多余空行压缩
    .trim()
}
