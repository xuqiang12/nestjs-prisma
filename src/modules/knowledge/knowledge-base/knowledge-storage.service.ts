import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { basename, dirname, join, normalize } from 'path'

@Injectable()
export class KnowledgeStorageService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'knowledge')

  checksum(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex')
  }

  async saveFile(knowledgeBaseCode: string, fileId: string, originalName: string, buffer: Buffer) {
    const safeCode = this.safeSegment(knowledgeBaseCode)
    const safeFileName = this.safeFileName(originalName)
    const relativePath = join('uploads', 'knowledge', safeCode, fileId, safeFileName)
    const absolutePath = this.resolveRelativePath(relativePath)
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, buffer)
    return relativePath.replace(/\\/g, '/')
  }

  async readStoragePath(storagePath: string) {
    return readFile(this.resolveRelativePath(storagePath))
  }

  createReadStream(storagePath: string) {
    return createReadStream(this.resolveRelativePath(storagePath))
  }

  resolveDownloadPath(storagePath: string) {
    return this.resolveRelativePath(storagePath)
  }

  async removeFileDirectory(knowledgeBaseCode: string, fileId: string) {
    const dir = join(this.rootDir, this.safeSegment(knowledgeBaseCode), fileId)
    await rm(dir, { recursive: true, force: true })
  }

  async removeKnowledgeBaseDirectory(knowledgeBaseCode: string) {
    const dir = join(this.rootDir, this.safeSegment(knowledgeBaseCode))
    await rm(dir, { recursive: true, force: true })
  }

  private resolveRelativePath(storagePath: string) {
    const absolutePath = normalize(join(process.cwd(), storagePath))
    if (!absolutePath.startsWith(this.rootDir)) {
      throw new Error('文件路径不合法')
    }
    return absolutePath
  }

  private safeSegment(value: string) {
    return value.replace(/[^\w-]/g, '_')
  }

  private safeFileName(value: string) {
    return basename(value).replace(/[\\/:*?"<>|]/g, '_')
  }
}
