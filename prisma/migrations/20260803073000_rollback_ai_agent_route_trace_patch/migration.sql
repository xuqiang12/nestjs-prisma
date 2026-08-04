DROP TABLE IF EXISTS "AiAgentRouteFeedback";
DROP TABLE IF EXISTS "AiAgentRouteEvaluation";
DROP TABLE IF EXISTS "AiAgentRunTrace";
DROP TABLE IF EXISTS "AiAgentCapability";

DROP INDEX IF EXISTS "AiMessage_agentCode_route_createdAt_idx";
DROP INDEX IF EXISTS "AiMessage_route_createdAt_idx";

ALTER TABLE "AiMessage"
DROP COLUMN IF EXISTS "route",
DROP COLUMN IF EXISTS "capabilityType",
DROP COLUMN IF EXISTS "capabilityCode",
DROP COLUMN IF EXISTS "routerReason",
DROP COLUMN IF EXISTS "routerConfidence",
DROP COLUMN IF EXISTS "workflowRunId";
