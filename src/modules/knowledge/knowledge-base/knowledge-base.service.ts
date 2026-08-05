import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { VectorStoreService } from '../../../ai-engine/vector/vector-store.service'
import {
  CreateKnowledgeBaseDto,
  KnowledgeBaseListDto,
  KnowledgeChunkListDto,
  KnowledgeFileListDto,
  KnowledgeSearchTestDto,
  UpdateKnowledgeBaseDto,
} from './dto/knowledge-base.dto'
import { EMBEDDING_PROFILES, getEmbeddingProfile } from './embedding-profiles'
import { KnowledgeStorageService } from './knowledge-storage.service'

const COMPLETED = 'completed'
const PROCESSING = 'processing'
const FAILED = 'failed'

/**
 * 知识库资产管理服务，负责知识库配置、源文件、分片和向量重建。
 * Agent/RAG 的最终回答链路仍由 ai-engine/runtime 消费这些资产，这里只提供管理侧能力。
 */
@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly storageService: KnowledgeStorageService,
  ) {}

  // 知识库配置管理：维护管理端列表、详情、启停和基础参数，不直接参与运行时问答决策。
  async list(query: KnowledgeBaseListDto) {
    const pageNum = Number(query.pageNum || 1)
    const pageSize = Number(query.pageSize || 10)
    const where: Prisma.AiKnowledgeBaseWhereInput = {
      ...(query.keyword ? {
        OR: [
          { name: { contains: query.keyword, mode: 'insensitive' } },
          { code: { contains: query.keyword, mode: 'insensitive' } },
        ],
      } : {}),
      ...(query.status !== undefined ? { status: Number(query.status) } : {}),
    }
    const [list, total] = await Promise.all([
      this.prisma.aiKnowledgeBase.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { files: true, documents: true } },
        },
      }),
      this.prisma.aiKnowledgeBase.count({ where }),
    ])

    return {
      list: list.map((item) => this.toListItem(item)),
      total,
      pageNum,
      pageSize,
    }
  }

  async detail(id: string) {
    const item = await this.prisma.aiKnowledgeBase.findUnique({
      where: { id },
      include: {
        _count: { select: { files: true, documents: true } },
      },
    })
    if (!item) {
      throw new NotFoundException('知识库不存在')
    }
    return {
      ...this.hideApiKey(item),
      fileCount: item._count.files,
      chunkCount: item._count.documents,
    }
  }

  async embeddingProfiles() {
    return EMBEDDING_PROFILES
  }

  async enabledOptions() {
    return this.prisma.aiKnowledgeBase.findMany({
      where: { status: 1 },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    })
  }

  async create(dto: CreateKnowledgeBaseDto) {
    const created = await this.prisma.aiKnowledgeBase.create({
      data: {
        ...this.toKnowledgeBaseData(dto),
        code: await this.nextKnowledgeBaseCode(),
      } as Prisma.AiKnowledgeBaseUncheckedCreateInput,
    })
    void created
    return '知识库新增成功'
  }

  async update(dto: UpdateKnowledgeBaseDto) {
    const current = await this.ensureKnowledgeBase(dto.id)
    const profile = getEmbeddingProfile(dto.embeddingProfileCode || current.embeddingProfileCode)
    if (profile.dimension !== current.embeddingDimension) {
      const chunkCount = await this.prisma.document.count({ where: { knowledgeBaseId: dto.id } })
      if (chunkCount > 0) {
        throw new BadRequestException('已有分片时不能修改向量维度')
      }
    }
    const data = this.toKnowledgeBaseData(dto, current.embeddingProfileCode)
    delete data.code
    await this.prisma.aiKnowledgeBase.update({
      where: { id: dto.id },
      data: data as Prisma.AiKnowledgeBaseUncheckedUpdateInput,
    })
    return '知识库修改成功'
  }

  async updateStatus(id: string, status: number) {
    await this.ensureKnowledgeBase(id)
    await this.prisma.aiKnowledgeBase.update({ where: { id }, data: { status } })
    return '知识库状态修改成功'
  }

  async delete(id: string) {
    const knowledgeBase = await this.ensureKnowledgeBase(id)
    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { knowledgeBaseId: id } }),
      this.prisma.aiKnowledgeFile.deleteMany({ where: { knowledgeBaseId: id } }),
      this.prisma.aiKnowledgeBaseAgent.deleteMany({ where: { knowledgeBaseId: id } }),
      this.prisma.aiKnowledgeBase.delete({ where: { id } }),
    ])
    await this.storageService.removeKnowledgeBaseDirectory(knowledgeBase.code)
    return '知识库删除成功'
  }

  // 文件资产管理：文件变更会同步本地存储、文件记录和对应 Document 向量分片。
  async fileList(query: KnowledgeFileListDto) {
    await this.ensureKnowledgeBase(query.knowledgeBaseId)
    return this.prisma.aiKnowledgeFile.findMany({
      where: {
        knowledgeBaseId: query.knowledgeBaseId,
        ...(query.keyword ? { originalName: { contains: query.keyword, mode: 'insensitive' } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async uploadFile(knowledgeBaseId: string, file: Express.Multer.File) {
    const knowledgeBase = await this.ensureEnabledKnowledgeBase(knowledgeBaseId)
    if (!file) {
      throw new BadRequestException('请选择上传文件')
    }
    const originalName = this.normalizeOriginalName(file.originalname)
    const createdFile = await this.prisma.aiKnowledgeFile.create({
      data: {
        knowledgeBaseId,
        originalName: originalName,
        storagePath: '',
        mimeType: file.mimetype,
        size: file.size,
        checksum: this.storageService.checksum(file.buffer),
        status: PROCESSING,
      },
    })

    try {
      const storagePath = await this.storageService.saveFile(knowledgeBase.code, createdFile.id, originalName, file.buffer)
      const count = await this.rebuildFileChunks(knowledgeBaseId, createdFile.id, file.buffer.toString('utf-8'), {
        fileName: originalName,
        source: '文件上传',
      })
      await this.prisma.aiKnowledgeFile.update({
        where: { id: createdFile.id },
        data: { storagePath, chunkCount: count, status: COMPLETED, errorMessage: null },
      })
      return '文件上传成功'
    } catch (error) {
      await this.prisma.aiKnowledgeFile.update({
        where: { id: createdFile.id },
        data: { status: FAILED, errorMessage: this.errorMessage(error) },
      })
      throw error
    }
  }

  async downloadFile(fileId: string) {
    const file = await this.ensureFile(fileId)
    return {
      absolutePath: this.storageService.resolveDownloadPath(file.storagePath),
      originalName: file.originalName,
    }
  }

  async replaceFile(knowledgeBaseId: string, fileId: string, file: Express.Multer.File) {
    const knowledgeBase = await this.ensureEnabledKnowledgeBase(knowledgeBaseId)
    const current = await this.ensureFile(fileId, knowledgeBaseId)
    if (!file) {
      throw new BadRequestException('请选择上传文件')
    }
    const originalName = this.normalizeOriginalName(file.originalname)
    try {
      await this.prisma.aiKnowledgeFile.update({ where: { id: fileId }, data: { status: PROCESSING, errorMessage: null } })
      await this.storageService.removeFileDirectory(knowledgeBase.code, fileId)
      const storagePath = await this.storageService.saveFile(knowledgeBase.code, fileId, originalName, file.buffer)
      const count = await this.rebuildFileChunks(knowledgeBaseId, fileId, file.buffer.toString('utf-8'), {
        fileName: originalName,
        source: '文件替换',
      })
      await this.prisma.aiKnowledgeFile.update({
        where: { id: fileId },
        data: {
          originalName: originalName,
          storagePath,
          mimeType: file.mimetype,
          size: file.size,
          checksum: this.storageService.checksum(file.buffer),
          chunkCount: count,
          status: COMPLETED,
          errorMessage: null,
        },
      })
      return '文件替换成功'
    } catch (error) {
      await this.prisma.aiKnowledgeFile.update({
        where: { id: current.id },
        data: { status: FAILED, errorMessage: this.errorMessage(error) },
      })
      throw error
    }
  }

  async rechunkFile(knowledgeBaseId: string, fileId: string) {
    const knowledgeBase = await this.ensureEnabledKnowledgeBase(knowledgeBaseId)
    const file = await this.ensureFile(fileId, knowledgeBaseId)
    const buffer = await this.storageService.readStoragePath(file.storagePath)
    const count = await this.rebuildFileChunks(knowledgeBase.id, file.id, buffer.toString('utf-8'), {
      fileName: file.originalName,
      source: '重新分片',
    })
    await this.prisma.aiKnowledgeFile.update({
      where: { id: file.id },
      data: { chunkCount: count, status: COMPLETED, errorMessage: null },
    })
    return '文件重新分片成功'
  }

  async rechunkAll(knowledgeBaseId: string) {
    await this.ensureEnabledKnowledgeBase(knowledgeBaseId)
    const files = await this.prisma.aiKnowledgeFile.findMany({ where: { knowledgeBaseId } })
    for (const file of files) {
      await this.rechunkFile(knowledgeBaseId, file.id)
    }
    return '知识库全部重新分片成功'
  }

  async deleteFile(knowledgeBaseId: string, fileId: string) {
    const knowledgeBase = await this.ensureKnowledgeBase(knowledgeBaseId)
    await this.ensureFile(fileId, knowledgeBaseId)
    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { fileId } }),
      this.prisma.aiKnowledgeFile.delete({ where: { id: fileId } }),
    ])
    await this.storageService.removeFileDirectory(knowledgeBase.code, fileId)
    return '文件删除成功'
  }

  // 分片维护：直接操作 Document 表和向量内容，删除分片后同步文件维度的 chunkCount。
  async chunkList(query: KnowledgeChunkListDto) {
    return this.vectorStoreService.list(
      Number(query.pageNum || 1),
      Number(query.pageSize || 10),
      { knowledgeBaseId: query.knowledgeBaseId, fileId: query.fileId },
    )
  }

  async chunkDetail(id: string) {
    const chunk = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        metadata: true,
        knowledgeBaseId: true,
        fileId: true,
        chunkIndex: true,
        tokenCount: true,
        charStart: true,
        charEnd: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!chunk) {
      throw new NotFoundException('分片不存在')
    }
    return chunk
  }

  async updateChunk(id: string, content: string) {
    await this.chunkDetail(id)
    await this.vectorStoreService.updateContent(id, content)
    return '分片修改成功'
  }

  async deleteChunk(id: string) {
    const chunk = await this.chunkDetail(id)
    await this.prisma.document.delete({ where: { id } })
    if (chunk.fileId) {
      await this.syncFileChunkCount(chunk.fileId)
    }
    return '分片删除成功'
  }

  // 管理端检索测试：复用当前知识库的向量配置和阈值，仅用于验证召回效果。
  async searchTest(query: KnowledgeSearchTestDto) {
    const knowledgeBase = await this.ensureEnabledKnowledgeBase(query.knowledgeBaseId)
    const list = await this.vectorStoreService.similaritySearch(query.query, query.limit || knowledgeBase.retrievalLimit, {
      knowledgeBaseIds: [query.knowledgeBaseId],
      embeddingConfig: this.toEmbeddingConfig(knowledgeBase),
    })
    return list.filter((item) => Number(item.distance) <= knowledgeBase.similarityThreshold)
  }

  // 重建文件分片时先清理同文件旧 Document，再按知识库配置重新切分并写入向量。
  private async rebuildFileChunks(
    knowledgeBaseId: string,
    fileId: string,
    content: string,
    metadata: Record<string, any>,
  ) {
    const knowledgeBase = await this.ensureKnowledgeBase(knowledgeBaseId)
    await this.prisma.document.deleteMany({ where: { fileId } })
    const result = await this.vectorStoreService.addDocuments([content], metadata, {
      knowledgeBaseId,
      fileId,
      chunkSize: knowledgeBase.chunkSize,
      chunkOverlap: knowledgeBase.chunkOverlap,
      embeddingConfig: this.toEmbeddingConfig(knowledgeBase),
    })
    return result.count
  }

  private async syncFileChunkCount(fileId: string) {
    const chunkCount = await this.prisma.document.count({ where: { fileId } })
    await this.prisma.aiKnowledgeFile.update({ where: { id: fileId }, data: { chunkCount } })
  }

  private async ensureKnowledgeBase(id: string) {
    const knowledgeBase = await this.prisma.aiKnowledgeBase.findUnique({ where: { id } })
    if (!knowledgeBase) {
      throw new NotFoundException('知识库不存在')
    }
    return knowledgeBase
  }

  private async ensureEnabledKnowledgeBase(id: string) {
    const knowledgeBase = await this.ensureKnowledgeBase(id)
    if (knowledgeBase.status !== 1) {
      throw new BadRequestException('知识库未启用')
    }
    return knowledgeBase
  }

  private async ensureFile(fileId: string, knowledgeBaseId?: string) {
    const file = await this.prisma.aiKnowledgeFile.findFirst({
      where: { id: fileId, ...(knowledgeBaseId ? { knowledgeBaseId } : {}) },
    })
    if (!file) {
      throw new NotFoundException('知识文件不存在')
    }
    return file
  }

  // 统一 DTO 到数据库字段的映射，保证 embedding profile 是向量配置的唯一来源。
  private toKnowledgeBaseData(dto: CreateKnowledgeBaseDto | UpdateKnowledgeBaseDto, currentProfileCode?: string) {
    const profile = getEmbeddingProfile(dto.embeddingProfileCode || currentProfileCode)
    const data: Record<string, any> = {
      name: dto.name,
      description: dto.description,
      provider: profile.provider,
      endpoint: profile.endpoint,
      embeddingModel: profile.model,
      embeddingDimension: profile.dimension,
      embeddingProfileCode: profile.code,
      embeddingApiKeyMode: profile.apiKeyMode,
      embeddingApiKeyRef: profile.apiKeyRef,
      chunkSize: dto.chunkSize,
      chunkOverlap: dto.chunkOverlap,
      retrievalLimit: dto.retrievalLimit,
      similarityThreshold: dto.similarityThreshold,
      status: dto.status,
    }
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key])
    return data
  }

  private toListItem(item: any) {
    return {
      ...this.hideApiKey(item),
      fileCount: item._count.files,
      chunkCount: item._count.documents,
    }
  }

  private toEmbeddingConfig(knowledgeBase: {
    endpoint?: string | null
    embeddingModel?: string | null
    embeddingApiKeyRef?: string | null
  }) {
    return {
      endpoint: knowledgeBase.endpoint,
      model: knowledgeBase.embeddingModel,
      apiKeyRef: knowledgeBase.embeddingApiKeyRef,
    }
  }

  private async nextKnowledgeBaseCode() {
    const lastKnowledgeBase = await this.prisma.aiKnowledgeBase.findFirst({
      where: { code: { startsWith: 'ZSK' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    })
    const lastNumber = lastKnowledgeBase?.code && /^ZSK\d{16}$/.test(lastKnowledgeBase.code)
      ? BigInt(lastKnowledgeBase.code.slice(3))
      : 0n
    return `ZSK${String(lastNumber + 1n).padStart(16, '0')}`
  }

  private normalizeOriginalName(originalName: string) {
    const decoded = Buffer.from(originalName, 'latin1').toString('utf8')
    if (decoded && decoded !== originalName && !decoded.includes('�') && /[\u4e00-\u9fff]/.test(decoded)) {
      return decoded
    }
    return originalName
  }

  private hideApiKey<T extends { apiKeyEncrypted?: string | null }>(item: T) {
    const { apiKeyEncrypted, ...rest } = item
    return {
      ...rest,
      apiKeyConfigured: !!apiKeyEncrypted,
    }
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }
}
