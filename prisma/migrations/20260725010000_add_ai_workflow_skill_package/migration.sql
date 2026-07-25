-- AlterTable
ALTER TABLE "AiAgent" ADD COLUMN "workflowCode" TEXT;

-- AlterTable
ALTER TABLE "AiMessage" ADD COLUMN "workflowCode" TEXT;

-- CreateTable
CREATE TABLE "AiWorkflow" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiWorkflowNode" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "sortNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiWorkflowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiWorkflowEdge" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromNodeKey" TEXT NOT NULL,
    "toNodeKey" TEXT NOT NULL,
    "condition" JSONB,
    "sortNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiWorkflowEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSkillPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "promptCodes" JSONB,
    "toolCodes" JSONB,
    "workflowCode" TEXT,
    "agentDefaults" JSONB,
    "status" INTEGER NOT NULL DEFAULT 1,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSkillPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiWorkflowRun" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT,
    "agentCode" TEXT NOT NULL,
    "workflowCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiWorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiWorkflowRunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiWorkflowRunStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiWorkflow_code_key" ON "AiWorkflow"("code");

-- CreateIndex
CREATE INDEX "AiWorkflow_status_updatedAt_idx" ON "AiWorkflow"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiWorkflowNode_workflowId_nodeKey_key" ON "AiWorkflowNode"("workflowId", "nodeKey");

-- CreateIndex
CREATE INDEX "AiWorkflowNode_workflowId_sortNo_idx" ON "AiWorkflowNode"("workflowId", "sortNo");

-- CreateIndex
CREATE INDEX "AiWorkflowEdge_workflowId_fromNodeKey_sortNo_idx" ON "AiWorkflowEdge"("workflowId", "fromNodeKey", "sortNo");

-- CreateIndex
CREATE UNIQUE INDEX "AiSkillPackage_code_key" ON "AiSkillPackage"("code");

-- CreateIndex
CREATE INDEX "AiSkillPackage_status_updatedAt_idx" ON "AiSkillPackage"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AiWorkflowRun_agentCode_workflowCode_createdAt_idx" ON "AiWorkflowRun"("agentCode", "workflowCode", "createdAt");

-- CreateIndex
CREATE INDEX "AiWorkflowRun_conversationId_createdAt_idx" ON "AiWorkflowRun"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiWorkflowRunStep_runId_createdAt_idx" ON "AiWorkflowRunStep"("runId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiWorkflowNode" ADD CONSTRAINT "AiWorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AiWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiWorkflowEdge" ADD CONSTRAINT "AiWorkflowEdge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AiWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiWorkflowRunStep" ADD CONSTRAINT "AiWorkflowRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiWorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
