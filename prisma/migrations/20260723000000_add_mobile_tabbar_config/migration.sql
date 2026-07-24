CREATE TABLE "mobile_tabbar_config" (
  "id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "config" JSONB NOT NULL,
  "status" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mobile_tabbar_config_pkey" PRIMARY KEY ("id")
);
