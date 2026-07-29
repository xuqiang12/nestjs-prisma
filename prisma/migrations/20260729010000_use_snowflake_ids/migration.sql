-- Generate numeric-string IDs in the database so every insert path shares one source.
CREATE SEQUENCE IF NOT EXISTS snowflake_id_seq;

CREATE OR REPLACE FUNCTION next_snowflake_id()
RETURNS text AS $$
DECLARE
  custom_epoch bigint := 1704067200000;
  now_ms bigint;
  seq bigint;
BEGIN
  now_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  seq := nextval('snowflake_id_seq') % 4096;
  RETURN (((now_ms - custom_epoch) << 22) | (1 << 12) | seq)::text;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS prompt_code_seq;

CREATE OR REPLACE FUNCTION next_prompt_code()
RETURNS text AS $$
BEGIN
  RETURN 'TSC' || lpad(nextval('prompt_code_seq')::text, 16, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION replace_json_text_values(input jsonb, from_value text, to_value text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  item jsonb;
  key text;
  value jsonb;
BEGIN
  IF input IS NULL THEN
    RETURN input;
  END IF;

  CASE jsonb_typeof(input)
    WHEN 'object' THEN
      result := '{}'::jsonb;
      FOR key, value IN SELECT * FROM jsonb_each(input) LOOP
        result := result || jsonb_build_object(key, replace_json_text_values(value, from_value, to_value));
      END LOOP;
      RETURN result;
    WHEN 'array' THEN
      result := '[]'::jsonb;
      FOR item IN SELECT * FROM jsonb_array_elements(input) LOOP
        result := result || jsonb_build_array(replace_json_text_values(item, from_value, to_value));
      END LOOP;
      RETURN result;
    WHEN 'string' THEN
      IF input #>> '{}' = from_value THEN
        RETURN to_jsonb(to_value);
      END IF;
      RETURN input;
    ELSE
      RETURN input;
  END CASE;
END;
$$ LANGUAGE plpgsql;

CREATE TEMP TABLE id_mapping (
  entity text NOT NULL,
  old_id text NOT NULL,
  new_id varchar(32) NOT NULL,
  PRIMARY KEY (entity, old_id),
  UNIQUE (entity, new_id)
) ON COMMIT DROP;

INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'User', "id"::text, next_snowflake_id() FROM "User";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'Role', "id"::text, next_snowflake_id() FROM "Role";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'Permission', "id"::text, next_snowflake_id() FROM "Permission";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'Menu', "id"::text, next_snowflake_id() FROM "Menu";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'MenuButton', "id"::text, next_snowflake_id() FROM "MenuButton";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'Document', "id"::text, next_snowflake_id() FROM "documents";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiConversation', "id"::text, next_snowflake_id() FROM "AiConversation";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiMessage', "id"::text, next_snowflake_id() FROM "AiMessage";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiPrompt', "id"::text, next_snowflake_id() FROM "AiPrompt";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiSensitiveWord', "id"::text, next_snowflake_id() FROM "AiSensitiveWord";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiAgent', "id"::text, next_snowflake_id() FROM "AiAgent";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiWorkflow', "id"::text, next_snowflake_id() FROM "AiWorkflow";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiWorkflowNode', "id"::text, next_snowflake_id() FROM "AiWorkflowNode";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiWorkflowEdge', "id"::text, next_snowflake_id() FROM "AiWorkflowEdge";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiSkillPackage', "id"::text, next_snowflake_id() FROM "AiSkillPackage";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiWorkflowRun', "id"::text, next_snowflake_id() FROM "AiWorkflowRun";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'AiWorkflowRunStep', "id"::text, next_snowflake_id() FROM "AiWorkflowRunStep";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'HomeDecoration', "id"::text, next_snowflake_id() FROM "home_decoration";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'HomeComponent', "id"::text, next_snowflake_id() FROM "home_component";
INSERT INTO id_mapping(entity, old_id, new_id) SELECT 'MobileTabBarConfig', "id"::text, next_snowflake_id() FROM "mobile_tabbar_config";

CREATE TEMP TABLE prompt_code_mapping AS
SELECT
  p."id"::text AS old_prompt_id,
  p."code" AS old_code,
  m.new_id AS new_prompt_id,
  'TSC' || lpad(row_number() OVER (ORDER BY p."createdAt", p."id")::text, 16, '0') AS new_code
FROM "AiPrompt" p
JOIN id_mapping m ON m.entity = 'AiPrompt' AND m.old_id = p."id"::text;

SELECT setval(
  'prompt_code_seq',
  GREATEST(COALESCE((SELECT count(*) FROM prompt_code_mapping), 0), 1),
  true
);

-- Drop constraints that reference columns whose types or names are changing.
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_roleId_fkey";
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_roleId_fkey";
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_permissionId_fkey";
ALTER TABLE "MenuRole" DROP CONSTRAINT IF EXISTS "MenuRole_menuId_fkey";
ALTER TABLE "MenuRole" DROP CONSTRAINT IF EXISTS "MenuRole_roleId_fkey";
ALTER TABLE "MenuButton" DROP CONSTRAINT IF EXISTS "MenuButton_menuId_fkey";
ALTER TABLE "MenuButton" DROP CONSTRAINT IF EXISTS "MenuButton_permissionId_fkey";
ALTER TABLE "AiConversation" DROP CONSTRAINT IF EXISTS "AiConversation_userId_fkey";
ALTER TABLE "AiMessage" DROP CONSTRAINT IF EXISTS "AiMessage_conversationId_fkey";
ALTER TABLE "AiWorkflowNode" DROP CONSTRAINT IF EXISTS "AiWorkflowNode_workflowId_fkey";
ALTER TABLE "AiWorkflowEdge" DROP CONSTRAINT IF EXISTS "AiWorkflowEdge_workflowId_fkey";
ALTER TABLE "AiWorkflowRunStep" DROP CONSTRAINT IF EXISTS "AiWorkflowRunStep_runId_fkey";
ALTER TABLE "home_component" DROP CONSTRAINT IF EXISTS "home_component_decoration_id_fkey";

ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_pkey";
ALTER TABLE "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_pkey";
ALTER TABLE "MenuRole" DROP CONSTRAINT IF EXISTS "MenuRole_pkey";

DROP INDEX IF EXISTS "MenuButton_permissionId_key";
DROP INDEX IF EXISTS "MenuButton_menuId_permissionId_key";
DROP INDEX IF EXISTS "AiConversation_userId_isDeleted_updatedAt_idx";
DROP INDEX IF EXISTS "AiMessage_conversationId_createdAt_idx";
DROP INDEX IF EXISTS "AiWorkflowNode_workflowId_nodeKey_key";
DROP INDEX IF EXISTS "AiWorkflowNode_workflowId_sortNo_idx";
DROP INDEX IF EXISTS "AiWorkflowEdge_workflowId_fromNodeKey_sortNo_idx";
DROP INDEX IF EXISTS "AiWorkflowRun_conversationId_createdAt_idx";
DROP INDEX IF EXISTS "AiWorkflowRunStep_runId_createdAt_idx";
DROP INDEX IF EXISTS "home_component_decoration_id_status_sort_no_idx";

-- Primary-key tables: add new IDs, fill from mapping, then swap.
ALTER TABLE "User" ADD COLUMN "_new_id" varchar(32);
UPDATE "User" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'User' AND m.old_id = t."id"::text;
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "User" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

ALTER TABLE "Role" ADD COLUMN "_new_id" varchar(32);
UPDATE "Role" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'Role' AND m.old_id = t."id"::text;
ALTER TABLE "Role" DROP CONSTRAINT "Role_pkey";
ALTER TABLE "Role" DROP COLUMN "id";
ALTER TABLE "Role" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "Role" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Role" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "Role" ADD CONSTRAINT "Role_pkey" PRIMARY KEY ("id");

ALTER TABLE "Permission" ADD COLUMN "_new_id" varchar(32);
UPDATE "Permission" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'Permission' AND m.old_id = t."id"::text;
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_pkey";
ALTER TABLE "Permission" DROP COLUMN "id";
ALTER TABLE "Permission" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "Permission" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Permission" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_pkey" PRIMARY KEY ("id");

ALTER TABLE "Menu" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "Menu" ADD COLUMN "_new_parentId" varchar(32);
UPDATE "Menu" t SET
  "_new_id" = id_map.new_id,
  "_new_parentId" = (
    SELECT parent_map.new_id
    FROM id_mapping parent_map
    WHERE parent_map.entity = 'Menu' AND parent_map.old_id = t."parentId"::text
  )
FROM id_mapping id_map
WHERE id_map.entity = 'Menu' AND id_map.old_id = t."id"::text;
ALTER TABLE "Menu" DROP CONSTRAINT "Menu_pkey";
ALTER TABLE "Menu" DROP COLUMN "id";
ALTER TABLE "Menu" DROP COLUMN "parentId";
ALTER TABLE "Menu" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "Menu" RENAME COLUMN "_new_parentId" TO "parentId";
ALTER TABLE "Menu" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Menu" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_pkey" PRIMARY KEY ("id");

ALTER TABLE "MenuButton" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "MenuButton" ADD COLUMN "_new_menuId" varchar(32);
ALTER TABLE "MenuButton" ADD COLUMN "_new_permissionId" varchar(32);
UPDATE "MenuButton" t SET
  "_new_id" = id_map.new_id,
  "_new_menuId" = menu_map.new_id,
  "_new_permissionId" = permission_map.new_id
FROM id_mapping id_map
, id_mapping menu_map
, id_mapping permission_map
WHERE id_map.entity = 'MenuButton' AND id_map.old_id = t."id"::text
  AND menu_map.entity = 'Menu' AND menu_map.old_id = t."menuId"::text
  AND permission_map.entity = 'Permission' AND permission_map.old_id = t."permissionId"::text;
ALTER TABLE "MenuButton" DROP CONSTRAINT "MenuButton_pkey";
ALTER TABLE "MenuButton" DROP COLUMN "id";
ALTER TABLE "MenuButton" DROP COLUMN "menuId";
ALTER TABLE "MenuButton" DROP COLUMN "permissionId";
ALTER TABLE "MenuButton" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "MenuButton" RENAME COLUMN "_new_menuId" TO "menuId";
ALTER TABLE "MenuButton" RENAME COLUMN "_new_permissionId" TO "permissionId";
ALTER TABLE "MenuButton" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "MenuButton" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "MenuButton" ALTER COLUMN "menuId" SET NOT NULL;
ALTER TABLE "MenuButton" ALTER COLUMN "permissionId" SET NOT NULL;
ALTER TABLE "MenuButton" ADD CONSTRAINT "MenuButton_pkey" PRIMARY KEY ("id");

ALTER TABLE "documents" ADD COLUMN "_new_id" varchar(32);
UPDATE "documents" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'Document' AND m.old_id = t."id"::text;
ALTER TABLE "documents" DROP CONSTRAINT "documents_pkey";
ALTER TABLE "documents" DROP COLUMN "id";
ALTER TABLE "documents" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "documents" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "documents" ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiPrompt" ADD COLUMN "_new_id" varchar(32);
UPDATE "AiPrompt" t SET "_new_id" = m.new_id, "code" = pcm.new_code
FROM id_mapping m
JOIN prompt_code_mapping pcm ON pcm.old_prompt_id = m.old_id
WHERE m.entity = 'AiPrompt' AND m.old_id = t."id"::text;
ALTER TABLE "AiPrompt" DROP CONSTRAINT "AiPrompt_pkey";
ALTER TABLE "AiPrompt" DROP COLUMN "id";
ALTER TABLE "AiPrompt" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiPrompt" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiPrompt" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiPrompt" ADD CONSTRAINT "AiPrompt_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiSensitiveWord" ADD COLUMN "_new_id" varchar(32);
UPDATE "AiSensitiveWord" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'AiSensitiveWord' AND m.old_id = t."id"::text;
ALTER TABLE "AiSensitiveWord" DROP CONSTRAINT "AiSensitiveWord_pkey";
ALTER TABLE "AiSensitiveWord" DROP COLUMN "id";
ALTER TABLE "AiSensitiveWord" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiSensitiveWord" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiSensitiveWord" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiSensitiveWord" ADD CONSTRAINT "AiSensitiveWord_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiWorkflow" ADD COLUMN "_new_id" varchar(32);
UPDATE "AiWorkflow" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'AiWorkflow' AND m.old_id = t."id"::text;
ALTER TABLE "AiWorkflow" DROP CONSTRAINT "AiWorkflow_pkey";
ALTER TABLE "AiWorkflow" DROP COLUMN "id";
ALTER TABLE "AiWorkflow" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiWorkflow" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiWorkflow" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiWorkflow" ADD CONSTRAINT "AiWorkflow_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiAgent" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiAgent" ADD COLUMN "promptId" varchar(32);
UPDATE "AiAgent" t SET
  "_new_id" = id_map.new_id,
  "promptId" = (
    SELECT pcm.new_prompt_id
    FROM prompt_code_mapping pcm
    WHERE pcm.old_code = t."promptCode"
  )
FROM id_mapping id_map
WHERE id_map.entity = 'AiAgent' AND id_map.old_id = t."id"::text;
ALTER TABLE "AiAgent" DROP CONSTRAINT "AiAgent_pkey";
ALTER TABLE "AiAgent" DROP COLUMN "id";
ALTER TABLE "AiAgent" DROP COLUMN "promptCode";
ALTER TABLE "AiAgent" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiAgent" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiAgent" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiAgent" ALTER COLUMN "promptId" SET NOT NULL;
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiConversation" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiConversation" ADD COLUMN "_new_userId" varchar(32);
UPDATE "AiConversation" t SET
  "_new_id" = id_map.new_id,
  "_new_userId" = user_map.new_id
FROM id_mapping id_map
, id_mapping user_map
WHERE id_map.entity = 'AiConversation' AND id_map.old_id = t."id"::text
  AND user_map.entity = 'User' AND user_map.old_id = t."userId"::text;
ALTER TABLE "AiConversation" DROP CONSTRAINT "AiConversation_pkey";
ALTER TABLE "AiConversation" DROP COLUMN "id";
ALTER TABLE "AiConversation" DROP COLUMN "userId";
ALTER TABLE "AiConversation" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiConversation" RENAME COLUMN "_new_userId" TO "userId";
ALTER TABLE "AiConversation" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiConversation" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiConversation" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiMessage" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiMessage" ADD COLUMN "_new_conversationId" varchar(32);
ALTER TABLE "AiMessage" ADD COLUMN "promptId" varchar(32);
UPDATE "AiMessage" t SET
  "_new_id" = id_map.new_id,
  "_new_conversationId" = conversation_map.new_id,
  "promptId" = (
    SELECT pcm.new_prompt_id
    FROM prompt_code_mapping pcm
    WHERE pcm.old_code = t."promptCode"
  )
FROM id_mapping id_map
, id_mapping conversation_map
WHERE id_map.entity = 'AiMessage' AND id_map.old_id = t."id"::text
  AND conversation_map.entity = 'AiConversation' AND conversation_map.old_id = t."conversationId"::text;
ALTER TABLE "AiMessage" DROP CONSTRAINT "AiMessage_pkey";
ALTER TABLE "AiMessage" DROP COLUMN "id";
ALTER TABLE "AiMessage" DROP COLUMN "conversationId";
ALTER TABLE "AiMessage" DROP COLUMN "promptCode";
ALTER TABLE "AiMessage" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiMessage" RENAME COLUMN "_new_conversationId" TO "conversationId";
ALTER TABLE "AiMessage" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiMessage" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiMessage" ALTER COLUMN "conversationId" SET NOT NULL;
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiWorkflowNode" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiWorkflowNode" ADD COLUMN "_new_workflowId" varchar(32);
UPDATE "AiWorkflowNode" t SET
  "_new_id" = id_map.new_id,
  "_new_workflowId" = workflow_map.new_id,
  "config" = CASE
    WHEN t."type" = 'prompt' AND t."config" ? 'promptCode' THEN
      (t."config" - 'promptCode') || jsonb_build_object(
        'promptId',
        (
          SELECT pcm.new_prompt_id
          FROM prompt_code_mapping pcm
          WHERE pcm.old_code = t."config"->>'promptCode'
        )
      )
    ELSE t."config"
  END
FROM id_mapping id_map
, id_mapping workflow_map
WHERE id_map.entity = 'AiWorkflowNode' AND id_map.old_id = t."id"::text
  AND workflow_map.entity = 'AiWorkflow' AND workflow_map.old_id = t."workflowId"::text;
ALTER TABLE "AiWorkflowNode" DROP CONSTRAINT "AiWorkflowNode_pkey";
ALTER TABLE "AiWorkflowNode" DROP COLUMN "id";
ALTER TABLE "AiWorkflowNode" DROP COLUMN "workflowId";
ALTER TABLE "AiWorkflowNode" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiWorkflowNode" RENAME COLUMN "_new_workflowId" TO "workflowId";
ALTER TABLE "AiWorkflowNode" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiWorkflowNode" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiWorkflowNode" ALTER COLUMN "workflowId" SET NOT NULL;
ALTER TABLE "AiWorkflowNode" ADD CONSTRAINT "AiWorkflowNode_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiWorkflowEdge" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiWorkflowEdge" ADD COLUMN "_new_workflowId" varchar(32);
UPDATE "AiWorkflowEdge" t SET
  "_new_id" = id_map.new_id,
  "_new_workflowId" = workflow_map.new_id
FROM id_mapping id_map
, id_mapping workflow_map
WHERE id_map.entity = 'AiWorkflowEdge' AND id_map.old_id = t."id"::text
  AND workflow_map.entity = 'AiWorkflow' AND workflow_map.old_id = t."workflowId"::text;
ALTER TABLE "AiWorkflowEdge" DROP CONSTRAINT "AiWorkflowEdge_pkey";
ALTER TABLE "AiWorkflowEdge" DROP COLUMN "id";
ALTER TABLE "AiWorkflowEdge" DROP COLUMN "workflowId";
ALTER TABLE "AiWorkflowEdge" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiWorkflowEdge" RENAME COLUMN "_new_workflowId" TO "workflowId";
ALTER TABLE "AiWorkflowEdge" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiWorkflowEdge" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiWorkflowEdge" ALTER COLUMN "workflowId" SET NOT NULL;
ALTER TABLE "AiWorkflowEdge" ADD CONSTRAINT "AiWorkflowEdge_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiSkillPackage" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiSkillPackage" ADD COLUMN "promptIds" jsonb;
UPDATE "AiSkillPackage" t SET
  "_new_id" = id_map.new_id,
  "promptIds" = (
    SELECT jsonb_agg(pcm.new_prompt_id ORDER BY arr.ord)
    FROM jsonb_array_elements_text(COALESCE(t."promptCodes"::jsonb, '[]'::jsonb)) WITH ORDINALITY arr(code, ord)
    JOIN prompt_code_mapping pcm ON pcm.old_code = arr.code
  ),
  "agentDefaults" = CASE
    WHEN t."agentDefaults" ? 'promptCode' THEN
      (t."agentDefaults" - 'promptCode') || jsonb_build_object(
        'promptId',
        (
          SELECT defaults_pcm.new_prompt_id
          FROM prompt_code_mapping defaults_pcm
          WHERE defaults_pcm.old_code = t."agentDefaults"->>'promptCode'
        )
      )
    ELSE t."agentDefaults"
  END
FROM id_mapping id_map
WHERE id_map.entity = 'AiSkillPackage' AND id_map.old_id = t."id"::text;
ALTER TABLE "AiSkillPackage" DROP CONSTRAINT "AiSkillPackage_pkey";
ALTER TABLE "AiSkillPackage" DROP COLUMN "id";
ALTER TABLE "AiSkillPackage" DROP COLUMN "promptCodes";
ALTER TABLE "AiSkillPackage" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiSkillPackage" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiSkillPackage" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiSkillPackage" ADD CONSTRAINT "AiSkillPackage_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiWorkflowRun" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiWorkflowRun" ADD COLUMN "_new_conversationId" varchar(32);
ALTER TABLE "AiWorkflowRun" ADD COLUMN "_new_messageId" varchar(32);
UPDATE "AiWorkflowRun" t SET
  "_new_id" = id_map.new_id,
  "_new_conversationId" = (
    SELECT conversation_map.new_id
    FROM id_mapping conversation_map
    WHERE conversation_map.entity = 'AiConversation' AND conversation_map.old_id = t."conversationId"::text
  ),
  "_new_messageId" = (
    SELECT message_map.new_id
    FROM id_mapping message_map
    WHERE message_map.entity = 'AiMessage' AND message_map.old_id = t."messageId"::text
  )
FROM id_mapping id_map
WHERE id_map.entity = 'AiWorkflowRun' AND id_map.old_id = t."id"::text;
ALTER TABLE "AiWorkflowRun" DROP CONSTRAINT "AiWorkflowRun_pkey";
ALTER TABLE "AiWorkflowRun" DROP COLUMN "id";
ALTER TABLE "AiWorkflowRun" DROP COLUMN "conversationId";
ALTER TABLE "AiWorkflowRun" DROP COLUMN "messageId";
ALTER TABLE "AiWorkflowRun" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiWorkflowRun" RENAME COLUMN "_new_conversationId" TO "conversationId";
ALTER TABLE "AiWorkflowRun" RENAME COLUMN "_new_messageId" TO "messageId";
ALTER TABLE "AiWorkflowRun" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiWorkflowRun" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiWorkflowRun" ADD CONSTRAINT "AiWorkflowRun_pkey" PRIMARY KEY ("id");

ALTER TABLE "AiWorkflowRunStep" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "AiWorkflowRunStep" ADD COLUMN "_new_runId" varchar(32);
UPDATE "AiWorkflowRunStep" t SET
  "_new_id" = id_map.new_id,
  "_new_runId" = run_map.new_id
FROM id_mapping id_map
, id_mapping run_map
WHERE id_map.entity = 'AiWorkflowRunStep' AND id_map.old_id = t."id"::text
  AND run_map.entity = 'AiWorkflowRun' AND run_map.old_id = t."runId"::text;
ALTER TABLE "AiWorkflowRunStep" DROP CONSTRAINT "AiWorkflowRunStep_pkey";
ALTER TABLE "AiWorkflowRunStep" DROP COLUMN "id";
ALTER TABLE "AiWorkflowRunStep" DROP COLUMN "runId";
ALTER TABLE "AiWorkflowRunStep" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "AiWorkflowRunStep" RENAME COLUMN "_new_runId" TO "runId";
ALTER TABLE "AiWorkflowRunStep" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiWorkflowRunStep" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "AiWorkflowRunStep" ALTER COLUMN "runId" SET NOT NULL;
ALTER TABLE "AiWorkflowRunStep" ADD CONSTRAINT "AiWorkflowRunStep_pkey" PRIMARY KEY ("id");

ALTER TABLE "home_decoration" ADD COLUMN "_new_id" varchar(32);
UPDATE "home_decoration" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'HomeDecoration' AND m.old_id = t."id"::text;
ALTER TABLE "home_decoration" DROP CONSTRAINT "home_decoration_pkey";
ALTER TABLE "home_decoration" DROP COLUMN "id";
ALTER TABLE "home_decoration" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "home_decoration" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "home_decoration" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "home_decoration" ADD CONSTRAINT "home_decoration_pkey" PRIMARY KEY ("id");

ALTER TABLE "home_component" ADD COLUMN "_new_id" varchar(32);
ALTER TABLE "home_component" ADD COLUMN "_new_decoration_id" varchar(32);
UPDATE "home_component" t SET
  "_new_id" = id_map.new_id,
  "_new_decoration_id" = decoration_map.new_id
FROM id_mapping id_map
, id_mapping decoration_map
WHERE id_map.entity = 'HomeComponent' AND id_map.old_id = t."id"::text
  AND decoration_map.entity = 'HomeDecoration' AND decoration_map.old_id = t."decoration_id"::text;
DO $$
DECLARE
  m record;
BEGIN
  FOR m IN SELECT old_id, new_id FROM id_mapping WHERE entity = 'HomeDecoration' LOOP
    UPDATE "home_component" SET "info" = replace_json_text_values("info"::jsonb, m.old_id, m.new_id);
    UPDATE "mobile_tabbar_config" SET "config" = replace_json_text_values("config"::jsonb, m.old_id, m.new_id);
  END LOOP;
END $$;
ALTER TABLE "home_component" DROP CONSTRAINT "home_component_pkey";
ALTER TABLE "home_component" DROP COLUMN "id";
ALTER TABLE "home_component" DROP COLUMN "decoration_id";
ALTER TABLE "home_component" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "home_component" RENAME COLUMN "_new_decoration_id" TO "decoration_id";
ALTER TABLE "home_component" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "home_component" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "home_component" ALTER COLUMN "decoration_id" SET NOT NULL;
ALTER TABLE "home_component" ADD CONSTRAINT "home_component_pkey" PRIMARY KEY ("id");

ALTER TABLE "mobile_tabbar_config" ADD COLUMN "_new_id" varchar(32);
UPDATE "mobile_tabbar_config" t SET "_new_id" = m.new_id FROM id_mapping m WHERE m.entity = 'MobileTabBarConfig' AND m.old_id = t."id"::text;
ALTER TABLE "mobile_tabbar_config" DROP CONSTRAINT "mobile_tabbar_config_pkey";
ALTER TABLE "mobile_tabbar_config" DROP COLUMN "id";
ALTER TABLE "mobile_tabbar_config" RENAME COLUMN "_new_id" TO "id";
ALTER TABLE "mobile_tabbar_config" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "mobile_tabbar_config" ALTER COLUMN "id" SET DEFAULT next_snowflake_id();
ALTER TABLE "mobile_tabbar_config" ADD CONSTRAINT "mobile_tabbar_config_pkey" PRIMARY KEY ("id");

-- Join tables are swapped after their referenced primary keys exist.
ALTER TABLE "UserRole" ADD COLUMN "_new_userId" varchar(32);
ALTER TABLE "UserRole" ADD COLUMN "_new_roleId" varchar(32);
UPDATE "UserRole" t SET
  "_new_userId" = user_map.new_id,
  "_new_roleId" = role_map.new_id
FROM id_mapping user_map
, id_mapping role_map
WHERE user_map.entity = 'User' AND user_map.old_id = t."userId"::text
  AND role_map.entity = 'Role' AND role_map.old_id = t."roleId"::text;
ALTER TABLE "UserRole" DROP COLUMN "userId";
ALTER TABLE "UserRole" DROP COLUMN "roleId";
ALTER TABLE "UserRole" RENAME COLUMN "_new_userId" TO "userId";
ALTER TABLE "UserRole" RENAME COLUMN "_new_roleId" TO "roleId";
ALTER TABLE "UserRole" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "UserRole" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId");

ALTER TABLE "RolePermission" ADD COLUMN "_new_roleId" varchar(32);
ALTER TABLE "RolePermission" ADD COLUMN "_new_permissionId" varchar(32);
UPDATE "RolePermission" t SET
  "_new_roleId" = role_map.new_id,
  "_new_permissionId" = permission_map.new_id
FROM id_mapping role_map
, id_mapping permission_map
WHERE role_map.entity = 'Role' AND role_map.old_id = t."roleId"::text
  AND permission_map.entity = 'Permission' AND permission_map.old_id = t."permissionId"::text;
ALTER TABLE "RolePermission" DROP COLUMN "roleId";
ALTER TABLE "RolePermission" DROP COLUMN "permissionId";
ALTER TABLE "RolePermission" RENAME COLUMN "_new_roleId" TO "roleId";
ALTER TABLE "RolePermission" RENAME COLUMN "_new_permissionId" TO "permissionId";
ALTER TABLE "RolePermission" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "RolePermission" ALTER COLUMN "permissionId" SET NOT NULL;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId");

ALTER TABLE "MenuRole" ADD COLUMN "_new_menuId" varchar(32);
ALTER TABLE "MenuRole" ADD COLUMN "_new_roleId" varchar(32);
UPDATE "MenuRole" t SET
  "_new_menuId" = menu_map.new_id,
  "_new_roleId" = role_map.new_id
FROM id_mapping menu_map
, id_mapping role_map
WHERE menu_map.entity = 'Menu' AND menu_map.old_id = t."menuId"::text
  AND role_map.entity = 'Role' AND role_map.old_id = t."roleId"::text;
ALTER TABLE "MenuRole" DROP COLUMN "menuId";
ALTER TABLE "MenuRole" DROP COLUMN "roleId";
ALTER TABLE "MenuRole" RENAME COLUMN "_new_menuId" TO "menuId";
ALTER TABLE "MenuRole" RENAME COLUMN "_new_roleId" TO "roleId";
ALTER TABLE "MenuRole" ALTER COLUMN "menuId" SET NOT NULL;
ALTER TABLE "MenuRole" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "MenuRole" ADD CONSTRAINT "MenuRole_pkey" PRIMARY KEY ("menuId", "roleId");

-- Foreign keys and indexes for the new string IDs.
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MenuRole" ADD CONSTRAINT "MenuRole_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuRole" ADD CONSTRAINT "MenuRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuButton" ADD CONSTRAINT "MenuButton_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuButton" ADD CONSTRAINT "MenuButton_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "AiPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiWorkflowNode" ADD CONSTRAINT "AiWorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AiWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiWorkflowEdge" ADD CONSTRAINT "AiWorkflowEdge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AiWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiWorkflowRunStep" ADD CONSTRAINT "AiWorkflowRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiWorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "home_component" ADD CONSTRAINT "home_component_decoration_id_fkey" FOREIGN KEY ("decoration_id") REFERENCES "home_decoration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MenuButton_permissionId_key" ON "MenuButton"("permissionId");
CREATE UNIQUE INDEX "MenuButton_menuId_permissionId_key" ON "MenuButton"("menuId", "permissionId");
CREATE INDEX "AiConversation_userId_isDeleted_updatedAt_idx" ON "AiConversation"("userId", "isDeleted", "updatedAt");
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
CREATE INDEX "AiAgent_promptId_idx" ON "AiAgent"("promptId");
CREATE UNIQUE INDEX "AiWorkflowNode_workflowId_nodeKey_key" ON "AiWorkflowNode"("workflowId", "nodeKey");
CREATE INDEX "AiWorkflowNode_workflowId_sortNo_idx" ON "AiWorkflowNode"("workflowId", "sortNo");
CREATE INDEX "AiWorkflowEdge_workflowId_fromNodeKey_sortNo_idx" ON "AiWorkflowEdge"("workflowId", "fromNodeKey", "sortNo");
CREATE INDEX "AiWorkflowRun_conversationId_createdAt_idx" ON "AiWorkflowRun"("conversationId", "createdAt");
CREATE INDEX "AiWorkflowRunStep_runId_createdAt_idx" ON "AiWorkflowRunStep"("runId", "createdAt");
CREATE INDEX "home_component_decoration_id_status_sort_no_idx" ON "home_component"("decoration_id", "status", "sort_no");
