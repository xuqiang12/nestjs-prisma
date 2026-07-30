ALTER TABLE "AiAgent"
  ADD COLUMN "avatar" TEXT,
  ADD COLUMN "welcomeMessage" TEXT,
  ADD COLUMN "recommendedQuestions" JSONB,
  ADD COLUMN "tags" JSONB;
