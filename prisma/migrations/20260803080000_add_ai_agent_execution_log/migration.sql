CREATE TABLE "AiAgentExecutionLog" (
  "id" VARCHAR(32) NOT NULL DEFAULT next_snowflake_id(),
  "conversationId" VARCHAR(32),
  "messageId" VARCHAR(32),
  "agentCode" TEXT,
  "route" TEXT,
  "planJson" JSONB,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiAgentExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiAgentExecutionLog_agentCode_status_createdAt_idx" ON "AiAgentExecutionLog"("agentCode", "status", "createdAt");
CREATE INDEX "AiAgentExecutionLog_conversationId_createdAt_idx" ON "AiAgentExecutionLog"("conversationId", "createdAt");
CREATE INDEX "AiAgentExecutionLog_messageId_idx" ON "AiAgentExecutionLog"("messageId");
