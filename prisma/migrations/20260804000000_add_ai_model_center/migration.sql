-- CreateTable
CREATE TABLE "AiModelProvider" (
    "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKeyEnv" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelConfig" (
    "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
    "providerId" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelType" TEXT NOT NULL DEFAULT 'chat',
    "capabilities" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AiAgent" ADD COLUMN "modelConfigId" VARCHAR(32);

-- CreateIndex
CREATE UNIQUE INDEX "AiModelProvider_code_key" ON "AiModelProvider"("code");

-- CreateIndex
CREATE INDEX "AiModelProvider_status_updatedAt_idx" ON "AiModelProvider"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelConfig_code_key" ON "AiModelConfig"("code");

-- CreateIndex
CREATE INDEX "AiModelConfig_providerId_status_idx" ON "AiModelConfig"("providerId", "status");

-- CreateIndex
CREATE INDEX "AiModelConfig_modelType_status_idx" ON "AiModelConfig"("modelType", "status");

-- CreateIndex
CREATE INDEX "AiModelConfig_modelType_isDefault_status_idx" ON "AiModelConfig"("modelType", "isDefault", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelConfig_one_default_per_type" ON "AiModelConfig"("modelType") WHERE "isDefault" = true AND "status" = 1;

-- CreateIndex
CREATE INDEX "AiAgent_modelConfigId_idx" ON "AiAgent"("modelConfigId");

-- AddForeignKey
ALTER TABLE "AiModelConfig" ADD CONSTRAINT "AiModelConfig_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiModelProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "AiModelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AiModelProvider" ("id", "name", "code", "baseUrl", "apiKeyEnv", "status", "createdAt", "updatedAt")
VALUES
  (next_snowflake_id()::text, '硅基流动', 'siliconflow', 'https://api.siliconflow.cn/v1', 'SILICONFLOW_API_KEY', 1, NOW(), NOW()),
  (next_snowflake_id()::text, '火山引擎', 'volcengine', 'https://ark.cn-beijing.volces.com/api/v3', 'VOLCENGINE_API_KEY', 1, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "AiModelConfig" ("id", "providerId", "name", "code", "modelName", "modelType", "capabilities", "isDefault", "status", "createdAt", "updatedAt")
SELECT next_snowflake_id()::text, p."id", 'DeepSeek V3.2', 'deepseek-v32-siliconflow', 'deepseek-ai/DeepSeek-V3.2', 'chat', '{"stream":true,"toolCall":false,"vision":false,"jsonMode":true,"contextWindow":64000}'::jsonb, true, 1, NOW(), NOW()
FROM "AiModelProvider" p
WHERE p."code" = 'siliconflow'
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "AiModelConfig" ("id", "providerId", "name", "code", "modelName", "modelType", "capabilities", "isDefault", "status", "createdAt", "updatedAt")
SELECT next_snowflake_id()::text, p."id", 'Qwen2.5 7B', 'qwen25-7b-siliconflow', 'Qwen/Qwen2.5-7B-Instruct', 'chat', '{"stream":true,"toolCall":false,"vision":false,"jsonMode":false,"contextWindow":32768}'::jsonb, false, 1, NOW(), NOW()
FROM "AiModelProvider" p
WHERE p."code" = 'siliconflow'
ON CONFLICT ("code") DO NOTHING;

UPDATE "AiAgent" a
SET "modelConfigId" = m."id"
FROM "AiModelConfig" m
WHERE a."model" = m."modelName"
  AND a."modelConfigId" IS NULL;
