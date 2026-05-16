import fs from 'fs-extra'
import path from 'path'
// import pdf from 'pdf-parse'
// import mammoth from 'mammoth'

/**
 * 读取文本 / md 文件
 */
async function readTextFile(filePath) {
  const allPath = path.resolve(process.cwd(), filePath)
  return await fs.readFile(allPath, 'utf-8')
}

/**
 * 读取 PDF
 */
async function readPdf(filePath) {
  const buffer = await fs.readFile(filePath)
  //   const data = await pdf(buffer)
  //   return data.text
}

/**
 * 读取 Word（docx）
 */
async function readWord(filePath) {
  const buffer = await fs.readFile(filePath)
  //   const result = await mammoth.extractRawText({ buffer })
  //   return result.value
}

/**
 * 主入口：自动识别文件类型
 */
export async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  switch (ext) {
    case '.txt':
    case '.md':
      return await readTextFile(filePath)

    case '.pdf':
      return await readPdf(filePath)

    case '.docx':
      return await readWord(filePath)

    default:
      throw new Error(`不支持的文件类型: ${ext}`)
  }
}
