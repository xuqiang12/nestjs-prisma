UPDATE "Menu"
SET "name" = 'AI中心',
    "component" = 'Layout',
    "icon" = 'cms-ai',
    "sort" = 0,
    "type" = 'MENU'::"MenuType",
    "updatedAt" = NOW()
WHERE "path" = '/AIEngine';

WITH root AS (
  SELECT "id" FROM "Menu" WHERE "path" = '/AIEngine' LIMIT 1
), groups AS (
  SELECT 'AI应用'::text AS name, '/AIEngine/application'::text AS path, 0 AS sort
  UNION ALL SELECT '基础配置', '/AIEngine/base', 1
  UNION ALL SELECT '高级配置', '/AIEngine/advanced', 2
)
INSERT INTO "Menu" ("id", "parentId", "name", "path", "component", "icon", "sort", "type", "createdAt", "updatedAt")
SELECT next_snowflake_id()::text, root."id", groups.name, groups.path, 'Layout', '', groups.sort, 'MENU'::"MenuType", NOW(), NOW()
FROM groups
CROSS JOIN root
WHERE NOT EXISTS (SELECT 1 FROM "Menu" m WHERE m."path" = groups.path);

WITH root AS (
  SELECT "id" FROM "Menu" WHERE "path" = '/AIEngine' LIMIT 1
), groups AS (
  SELECT 'AI应用'::text AS name, '/AIEngine/application'::text AS path, 0 AS sort
  UNION ALL SELECT '基础配置', '/AIEngine/base', 1
  UNION ALL SELECT '高级配置', '/AIEngine/advanced', 2
)
UPDATE "Menu" m
SET "parentId" = root."id",
    "name" = groups.name,
    "component" = 'Layout',
    "icon" = '',
    "sort" = groups.sort,
    "type" = 'MENU'::"MenuType",
    "updatedAt" = NOW()
FROM groups
CROSS JOIN root
WHERE m."path" = groups.path;

WITH targets AS (
  SELECT '/AIEngine/chat/index'::text AS path, 'AI对话'::text AS name, '/AIEngine/application'::text AS parent_path, 0 AS sort
  UNION ALL SELECT '/AIEngine/agent/index', '智能体管理', '/AIEngine/application', 1
  UNION ALL SELECT '/AIEngine/workflowRun/index', '运行日志', '/AIEngine/application', 2
  UNION ALL SELECT '/AIEngine/model/index', '模型管理', '/AIEngine/base', 0
  UNION ALL SELECT '/AIEngine/knowledge/index', '知识库管理', '/AIEngine/base', 1
  UNION ALL SELECT '/AIEngine/prompt/index', '提示词管理', '/AIEngine/base', 2
  UNION ALL SELECT '/AIEngine/sensitiveWord/index', '敏感词管理', '/AIEngine/base', 3
  UNION ALL SELECT '/AIEngine/skillPackage/index', '技能包管理', '/AIEngine/advanced', 0
  UNION ALL SELECT '/AIEngine/tool/index', '工具管理', '/AIEngine/advanced', 1
  UNION ALL SELECT '/AIEngine/workflow/index', '工作流管理', '/AIEngine/advanced', 2
), parent_menu AS (
  SELECT targets.path, targets.name, targets.sort, p."id" AS parent_id
  FROM targets
  JOIN "Menu" p ON p."path" = targets.parent_path
)
UPDATE "Menu" m
SET "parentId" = parent_menu.parent_id,
    "name" = parent_menu.name,
    "sort" = parent_menu.sort,
    "updatedAt" = NOW()
FROM parent_menu
WHERE m."path" = parent_menu.path;

INSERT INTO "MenuRole" ("menuId", "roleId")
SELECT m."id", r."id"
FROM "Menu" m
CROSS JOIN "Role" r
WHERE m."path" IN ('/AIEngine/application', '/AIEngine/base', '/AIEngine/advanced')
ON CONFLICT DO NOTHING;
