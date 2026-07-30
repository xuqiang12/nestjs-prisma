-- Detail routes are pure pages: routable, but not sidebar menu nodes.
UPDATE "Menu" SET "type" = 'PAGE' WHERE "path" = '/mobile/tabBar/detail';
