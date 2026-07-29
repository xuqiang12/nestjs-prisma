DELETE FROM "MenuRole"
WHERE "menuId" IN (
  SELECT "id" FROM "Menu" WHERE "path" = '/AIEngine/skillPackage/index'
);

DELETE FROM "MenuButton"
WHERE "menuId" IN (
  SELECT "id" FROM "Menu" WHERE "path" = '/AIEngine/skillPackage/index'
);

DELETE FROM "Menu"
WHERE "path" = '/AIEngine/skillPackage/index';

DELETE FROM "MenuButton"
WHERE "permissionId" IN (
  SELECT "id" FROM "Permission" WHERE "code" LIKE 'ai:skill-package:%'
);

DELETE FROM "RolePermission"
WHERE "permissionId" IN (
  SELECT "id" FROM "Permission" WHERE "code" LIKE 'ai:skill-package:%'
);

DELETE FROM "Permission"
WHERE "code" LIKE 'ai:skill-package:%';

DROP TABLE IF EXISTS "AiSkillPackage";
