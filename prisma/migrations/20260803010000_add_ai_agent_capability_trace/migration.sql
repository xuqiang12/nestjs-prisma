ALTER TABLE "AiMessage"
ADD COLUMN "route" TEXT,
ADD COLUMN "capabilityType" TEXT,
ADD COLUMN "capabilityCode" TEXT,
ADD COLUMN "routerReason" TEXT,
ADD COLUMN "routerConfidence" DOUBLE PRECISION,
ADD COLUMN "workflowRunId" VARCHAR(32);

CREATE TABLE "AiAgentCapability" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "agentId" VARCHAR(32) NOT NULL,
  "type" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortNo" INTEGER NOT NULL DEFAULT 0,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiAgentCapability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiAgentRunTrace" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "conversationId" VARCHAR(32),
  "messageId" VARCHAR(32),
  "agentCode" TEXT,
  "route" TEXT NOT NULL,
  "capabilityType" TEXT,
  "capabilityCode" TEXT,
  "routerReason" TEXT,
  "routerConfidence" DOUBLE PRECISION,
  "plannerInput" JSONB,
  "plannerOutput" JSONB,
  "executorInput" JSONB,
  "executorOutput" JSONB,
  "composerInput" JSONB,
  "composerOutput" JSONB,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiAgentRunTrace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiMessage_route_createdAt_idx" ON "AiMessage"("route", "createdAt");
CREATE INDEX "AiMessage_agentCode_route_createdAt_idx" ON "AiMessage"("agentCode", "route", "createdAt");
CREATE INDEX "AiAgentCapability_agentId_type_enabled_idx" ON "AiAgentCapability"("agentId", "type", "enabled");
CREATE INDEX "AiAgentCapability_type_code_idx" ON "AiAgentCapability"("type", "code");
CREATE INDEX "AiAgentRunTrace_agentCode_route_createdAt_idx" ON "AiAgentRunTrace"("agentCode", "route", "createdAt");
CREATE INDEX "AiAgentRunTrace_conversationId_createdAt_idx" ON "AiAgentRunTrace"("conversationId", "createdAt");
CREATE INDEX "AiAgentRunTrace_status_createdAt_idx" ON "AiAgentRunTrace"("status", "createdAt");

ALTER TABLE "AiAgentCapability"
ADD CONSTRAINT "AiAgentCapability_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
