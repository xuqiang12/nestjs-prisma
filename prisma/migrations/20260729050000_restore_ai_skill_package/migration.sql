CREATE TABLE IF NOT EXISTS "AiSkillPackage" (
    "id" varchar(32) NOT NULL DEFAULT next_snowflake_id(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "promptIds" JSONB,
    "toolCodes" JSONB,
    "workflowCode" TEXT,
    "agentDefaults" JSONB,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSkillPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiSkillPackage_code_key" ON "AiSkillPackage"("code");
CREATE INDEX IF NOT EXISTS "AiSkillPackage_status_updatedAt_idx" ON "AiSkillPackage"("status", "updatedAt");
