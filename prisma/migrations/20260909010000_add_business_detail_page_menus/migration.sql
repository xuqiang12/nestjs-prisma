-- 这个迁移补齐由数据库维护的业务详情页 PAGE 路由。
WITH pages(name, path, component, parent_path, sort) AS (
  VALUES
    ('首页装修', '/mobile/homeConfig/detail', '/mobile/homeConfig/detail', '/mobile', 0),
    ('底部导航装修详情', '/mobile/tabBar/detail', '/mobile/tabBar/detail', '/mobile', 0),
    ('文档管理', '/AIEngine/knowledge/document', '/AIEngine/knowledge/document', '/AIEngine/base', 0)
)
INSERT INTO "Menu" ("id", "parentId", "name", "path", "component", "icon", "sort", "type", "createdAt", "updatedAt")
SELECT next_snowflake_id()::text, parent."id", pages.name, pages.path, pages.component, '', pages.sort, 'PAGE'::"MenuType", NOW(), NOW()
FROM pages
JOIN "Menu" parent ON parent."path" = pages.parent_path
WHERE NOT EXISTS (SELECT 1 FROM "Menu" m WHERE m."path" = pages.path);

WITH pages(name, path, component, parent_path, sort) AS (
  VALUES
    ('首页装修', '/mobile/homeConfig/detail', '/mobile/homeConfig/detail', '/mobile', 0),
    ('底部导航装修详情', '/mobile/tabBar/detail', '/mobile/tabBar/detail', '/mobile', 0),
    ('文档管理', '/AIEngine/knowledge/document', '/AIEngine/knowledge/document', '/AIEngine/base', 0)
)
UPDATE "Menu" m
SET "parentId" = parent."id",
    "name" = pages.name,
    "component" = pages.component,
    "icon" = '',
    "sort" = pages.sort,
    "type" = 'PAGE'::"MenuType",
    "updatedAt" = NOW()
FROM pages
JOIN "Menu" parent ON parent."path" = pages.parent_path
WHERE m."path" = pages.path;

INSERT INTO "MenuRole" ("menuId", "roleId")
SELECT m."id", r."id"
FROM "Menu" m
CROSS JOIN "Role" r
WHERE m."path" IN ('/mobile/homeConfig/detail', '/mobile/tabBar/detail', '/AIEngine/knowledge/document')
ON CONFLICT DO NOTHING;
