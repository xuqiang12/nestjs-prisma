-- CreateTable
CREATE TABLE "AiKnowledgeBase" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ragMode" TEXT NOT NULL DEFAULT 'generic',
  "provider" TEXT NOT NULL DEFAULT 'current',
  "apiKeyEncrypted" TEXT,
  "endpoint" TEXT,
  "embeddingModel" TEXT,
  "embeddingDimension" INTEGER NOT NULL DEFAULT 1024,
  "responseBufferMb" INTEGER NOT NULL DEFAULT 8,
  "batchSize" INTEGER NOT NULL DEFAULT 10,
  "status" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiKnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiKnowledgeBaseAgent" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "knowledgeBaseId" VARCHAR(32) NOT NULL,
  "agentId" VARCHAR(32) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiKnowledgeBaseAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiKnowledgeFile" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "knowledgeBaseId" VARCHAR(32) NOT NULL,
  "originalName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT,
  "size" INTEGER NOT NULL DEFAULT 0,
  "checksum" TEXT,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiKnowledgeFile_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "documents"
  ADD COLUMN "knowledgeBaseId" VARCHAR(32),
  ADD COLUMN "fileId" VARCHAR(32),
  ADD COLUMN "chunkIndex" INTEGER DEFAULT 0,
  ADD COLUMN "tokenCount" INTEGER,
  ADD COLUMN "charStart" INTEGER,
  ADD COLUMN "charEnd" INTEGER,
  ADD COLUMN "status" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "AiKnowledgeBase_code_key" ON "AiKnowledgeBase"("code");
CREATE INDEX "AiKnowledgeBase_status_updatedAt_idx" ON "AiKnowledgeBase"("status", "updatedAt");
CREATE UNIQUE INDEX "AiKnowledgeBaseAgent_knowledgeBaseId_agentId_key" ON "AiKnowledgeBaseAgent"("knowledgeBaseId", "agentId");
CREATE INDEX "AiKnowledgeBaseAgent_agentId_idx" ON "AiKnowledgeBaseAgent"("agentId");
CREATE INDEX "AiKnowledgeFile_knowledgeBaseId_status_idx" ON "AiKnowledgeFile"("knowledgeBaseId", "status");
CREATE INDEX "documents_knowledgeBaseId_status_idx" ON "documents"("knowledgeBaseId", "status");
CREATE INDEX "documents_fileId_chunkIndex_idx" ON "documents"("fileId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "AiKnowledgeBaseAgent" ADD CONSTRAINT "AiKnowledgeBaseAgent_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "AiKnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiKnowledgeBaseAgent" ADD CONSTRAINT "AiKnowledgeBaseAgent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiKnowledgeFile" ADD CONSTRAINT "AiKnowledgeFile_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "AiKnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "AiKnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "AiKnowledgeFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
