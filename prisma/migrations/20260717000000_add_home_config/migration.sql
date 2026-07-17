CREATE TABLE "home_decoration" (
  "id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "scene" VARCHAR(32) NOT NULL,
  "status" INTEGER NOT NULL DEFAULT 1,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "remark" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "home_decoration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "home_component" (
  "id" VARCHAR(64) NOT NULL,
  "decoration_id" VARCHAR(64) NOT NULL,
  "template_id" VARCHAR(32) NOT NULL,
  "template_name" VARCHAR(100),
  "info" JSONB NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "home_component_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "home_decoration_scene_status_sort_no_idx" ON "home_decoration"("scene", "status", "sort_no");
CREATE INDEX "home_component_decoration_id_status_sort_no_idx" ON "home_component"("decoration_id", "status", "sort_no");

ALTER TABLE "home_component"
ADD CONSTRAINT "home_component_decoration_id_fkey"
FOREIGN KEY ("decoration_id") REFERENCES "home_decoration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
