INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" IN ('ai:model:list', 'ai:model:add', 'ai:model:update', 'ai:model:status')
ON CONFLICT DO NOTHING;
