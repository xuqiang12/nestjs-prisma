ALTER TABLE "AiKnowledgeBase"
  ADD COLUMN "embeddingProfileCode" TEXT NOT NULL DEFAULT 'siliconflow-default',
  ADD COLUMN "embeddingApiKeyMode" TEXT NOT NULL DEFAULT 'env',
  ADD COLUMN "embeddingApiKeyRef" TEXT DEFAULT 'SILICONFLOW_API_KEY',
  ADD COLUMN "chunkSize" INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN "chunkOverlap" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "retrievalLimit" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "similarityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.45;

ALTER TABLE "AiKnowledgeBase"
  ALTER COLUMN "provider" SET DEFAULT 'siliconflow';

UPDATE "AiKnowledgeBase"
SET
  "provider" = CASE WHEN "provider" = 'current' THEN 'siliconflow' ELSE "provider" END,
  "endpoint" = COALESCE("endpoint", 'https://api.siliconflow.cn/v1'),
  "embeddingModel" = COALESCE("embeddingModel", 'Alibaba-NLP/gte-Qwen2-7B-instruct'),
  "embeddingDimension" = COALESCE("embeddingDimension", 1024),
  "embeddingProfileCode" = COALESCE("embeddingProfileCode", 'siliconflow-default'),
  "embeddingApiKeyMode" = COALESCE("embeddingApiKeyMode", 'env'),
  "embeddingApiKeyRef" = COALESCE("embeddingApiKeyRef", 'SILICONFLOW_API_KEY');

DELETE FROM "MenuButton"
WHERE "menuId" IN (
  SELECT id FROM "Menu"
  WHERE path IN ('/AIEngine/knowledge/form', '/AIEngine/knowledge/detail', '/AIEngine/knowledge/edit')
);

DELETE FROM "MenuRole"
WHERE "menuId" IN (
  SELECT id FROM "Menu"
  WHERE path IN ('/AIEngine/knowledge/form', '/AIEngine/knowledge/detail', '/AIEngine/knowledge/edit')
);

DELETE FROM "Menu"
WHERE path IN ('/AIEngine/knowledge/form', '/AIEngine/knowledge/detail', '/AIEngine/knowledge/edit');
