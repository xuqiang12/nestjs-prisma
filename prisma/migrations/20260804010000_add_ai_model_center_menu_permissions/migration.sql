INSERT INTO "Permission" ("id", "code", "name")
VALUES
  (next_snowflake_id()::text, 'ai:model:list', '查询模型配置'),
  (next_snowflake_id()::text, 'ai:model:add', '新增模型配置'),
  (next_snowflake_id()::text, 'ai:model:update', '修改模型配置'),
  (next_snowflake_id()::text, 'ai:model:status', '修改模型配置状态')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

WITH parent AS (
  SELECT "id" FROM "Menu" WHERE "path" = '/AIEngine' LIMIT 1
), existed AS (
  SELECT "id" FROM "Menu" WHERE "path" IN ('/AIEngine/model/index', '/AIEngine/model') LIMIT 1
), upserted AS (
  INSERT INTO "Menu" ("id", "parentId", "name", "path", "component", "icon", "sort", "type", "createdAt", "updatedAt")
  SELECT next_snowflake_id()::text, parent."id", '模型管理', '/AIEngine/model/index', '/AIEngine/model/index', '', 4, 'MENU'::"MenuType", NOW(), NOW()
  FROM parent
  WHERE NOT EXISTS (SELECT 1 FROM existed)
  RETURNING "id"
), model_menu AS (
  SELECT "id" FROM upserted
  UNION ALL
  SELECT "id" FROM existed
)
UPDATE "Menu"
SET "parentId" = (SELECT "id" FROM parent),
    "name" = '模型管理',
    "path" = '/AIEngine/model/index',
    "component" = '/AIEngine/model/index',
    "icon" = '',
    "sort" = 4,
    "type" = 'MENU'::"MenuType",
    "updatedAt" = NOW()
WHERE "id" = (SELECT "id" FROM model_menu LIMIT 1);

WITH model_menu AS (
  SELECT "id" FROM "Menu" WHERE "path" = '/AIEngine/model/index' LIMIT 1
), buttons AS (
  SELECT 'ai:model:list'::text AS code, '查询'::text AS name, 1 AS sort
  UNION ALL SELECT 'ai:model:add', '新增', 2
  UNION ALL SELECT 'ai:model:update', '修改', 3
  UNION ALL SELECT 'ai:model:status', '启停', 4
)
INSERT INTO "MenuButton" ("id", "menuId", "permissionId", "name", "sort")
SELECT next_snowflake_id()::text, model_menu."id", p."id", buttons.name, buttons.sort
FROM buttons
JOIN "Permission" p ON p."code" = buttons.code
CROSS JOIN model_menu
ON CONFLICT ("permissionId") DO UPDATE
SET "menuId" = EXCLUDED."menuId",
    "name" = EXCLUDED."name",
    "sort" = EXCLUDED."sort";

INSERT INTO "MenuRole" ("menuId", "roleId")
SELECT m."id", r."id"
FROM "Menu" m
CROSS JOIN "Role" r
WHERE m."path" = '/AIEngine/model/index'
ON CONFLICT DO NOTHING;
