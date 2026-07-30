ALTER TABLE "AiAgent"
  ADD COLUMN "promptSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "promptSnapshot" TEXT,
  ADD COLUMN "promptEnhancement" TEXT,
  ADD COLUMN "knowledgeStrict" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AiAgent"
  DROP COLUMN IF EXISTS "knowledgeTags";
