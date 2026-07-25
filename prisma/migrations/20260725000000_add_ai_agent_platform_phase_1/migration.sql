-- AlterTable
ALTER TABLE "AiConversation" ADD COLUMN "agentCode" TEXT;

-- AlterTable
ALTER TABLE "AiMessage" ADD COLUMN "agentCode" TEXT,
ADD COLUMN "promptCode" TEXT;

-- CreateTable
CREATE TABLE "AiPrompt" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSensitiveWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "replaceWith" TEXT,
    "scope" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSensitiveWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "promptCode" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'chat',
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "topP" DOUBLE PRECISION,
    "knowledgeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "toolCodes" JSONB,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiPrompt_code_key" ON "AiPrompt"("code");

-- CreateIndex
CREATE INDEX "AiPrompt_scene_status_idx" ON "AiPrompt"("scene", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiSensitiveWord_word_scope_key" ON "AiSensitiveWord"("word", "scope");

-- CreateIndex
CREATE INDEX "AiSensitiveWord_scope_status_idx" ON "AiSensitiveWord"("scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgent_code_key" ON "AiAgent"("code");

-- CreateIndex
CREATE INDEX "AiAgent_mode_status_idx" ON "AiAgent"("mode", "status");
