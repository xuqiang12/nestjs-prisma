-- Rename the old directory value to the business-facing sidebar menu value.
ALTER TYPE "MenuType" RENAME VALUE 'DIRECTORY' TO 'MENU';

-- Existing rows were all sidebar menu nodes under the old DIRECTORY/PAGE split.
UPDATE "Menu" SET "type" = 'MENU' WHERE "type" = 'PAGE';

ALTER TABLE "Menu" ALTER COLUMN "type" SET DEFAULT 'MENU';
