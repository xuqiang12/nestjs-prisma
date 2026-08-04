-- CreateTable
CREATE TABLE "AiAgentRouteEvaluation" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "name" TEXT NOT NULL,
  "agentCode" TEXT,
  "message" TEXT NOT NULL,
  "expectedRoute" TEXT NOT NULL,
  "expectedCapabilityType" TEXT,
  "expectedCapabilityCode" TEXT,
  "mustNotRoute" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortNo" INTEGER NOT NULL DEFAULT 0,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiAgentRouteEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentRouteFeedback" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "traceId" VARCHAR(32),
  "conversationId" VARCHAR(32),
  "messageId" VARCHAR(32),
  "agentCode" TEXT,
  "actualRoute" TEXT,
  "actualCapabilityType" TEXT,
  "actualCapabilityCode" TEXT,
  "expectedRoute" TEXT,
  "expectedCapabilityType" TEXT,
  "expectedCapabilityCode" TEXT,
  "correct" BOOLEAN NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiAgentRouteFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAgentRouteEvaluation_agentCode_enabled_sortNo_idx" ON "AiAgentRouteEvaluation"("agentCode", "enabled", "sortNo");

-- CreateIndex
CREATE INDEX "AiAgentRouteEvaluation_expectedRoute_enabled_idx" ON "AiAgentRouteEvaluation"("expectedRoute", "enabled");

-- CreateIndex
CREATE INDEX "AiAgentRouteFeedback_traceId_createdAt_idx" ON "AiAgentRouteFeedback"("traceId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAgentRouteFeedback_agentCode_correct_createdAt_idx" ON "AiAgentRouteFeedback"("agentCode", "correct", "createdAt");

-- CreateIndex
CREATE INDEX "AiAgentRouteFeedback_expectedRoute_createdAt_idx" ON "AiAgentRouteFeedback"("expectedRoute", "createdAt");

-- AddForeignKey
ALTER TABLE "AiAgentRouteFeedback" ADD CONSTRAINT "AiAgentRouteFeedback_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "AiAgentRunTrace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
