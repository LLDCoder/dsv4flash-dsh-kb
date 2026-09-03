\set ON_ERROR_STOP on

-- Required invocation variables make an accidental run against the copied
-- remote source fail before any transaction begins.
SELECT :'target_portal' = 'admin' AS target_is_admin,
       current_database() = :'expected_database' AS database_matches,
       inet_server_addr() IS NULL OR inet_server_addr() = inet '127.0.0.1' AS server_is_local,
       current_setting('server_version_num')::integer >= 180000 AS server_is_postgres18
\gset

\if :target_is_admin
\else
  \echo 'Refusing migration: target_portal must be admin.'
  \quit 3
\endif

\if :database_matches
\else
  \echo 'Refusing migration: connected database does not match expected_database.'
  \quit 3
\endif

\if :server_is_local
\else
  \echo 'Refusing migration: server must be reached through a local socket or loopback.'
  \quit 3
\endif

\if :server_is_postgres18
\else
  \echo 'Refusing migration: local Admin development requires PostgreSQL 18.'
  \quit 3
\endif

BEGIN;

-- The new runtime has exactly two Skills. Page and role guidance belongs in
-- the knowledge base, while current permissions come from GetUserInfo.
DELETE FROM skill
WHERE skill_id NOT IN ('admin_portal_reader', 'general_knowledge');

DELETE FROM skill
WHERE skill_id IN ('admin_portal_reader', 'general_knowledge')
  AND version <> 1;

INSERT INTO skill (
  skill_id,
  name,
  version,
  source,
  status,
  scope,
  enabled,
  allowed_tools,
  dependencies,
  content,
  updated_by,
  updated_at
)
VALUES
  (
    'admin_portal_reader',
    'Admin Portal reader',
    1,
    'builtin',
    'PUBLISHED',
    'system',
    TRUE,
    '["knowledge.search", "admin.portal.read"]'::jsonb,
    '["knowledge_gateway", "admin_portal_reader"]'::jsonb,
    'Read the current Admin Portal state using the caller''s verified GetUserInfo permissions. Use only knowledge.search and admin.portal.read. Visit only pages needed for the question, never perform a mutation, and distinguish success, no_data, no_permission, load_failed, and not_confirmed.',
    'system',
    NOW()
  ),
  (
    'general_knowledge',
    'General knowledge-base guidance',
    1,
    'builtin',
    'PUBLISHED',
    'system',
    TRUE,
    '["knowledge.search"]'::jsonb,
    '["knowledge_gateway"]'::jsonb,
    'Answer non-Portal general knowledge and document questions from retrieved evidence. Do not use this Skill for current Admin Portal page state.',
    'system',
    NOW()
  )
ON CONFLICT (skill_id, version) DO UPDATE SET
  name = EXCLUDED.name,
  source = EXCLUDED.source,
  status = EXCLUDED.status,
  scope = EXCLUDED.scope,
  enabled = EXCLUDED.enabled,
  allowed_tools = EXCLUDED.allowed_tools,
  dependencies = EXCLUDED.dependencies,
  content = EXCLUDED.content,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at;

DELETE FROM config_entry
WHERE scope = 'system'
  AND key IN (
    'skill_router_fallback_skill_id',
    'skill_router_mode'
  );

ALTER TABLE skill
  DROP COLUMN IF EXISTS domain,
  DROP COLUMN IF EXISTS aliases,
  DROP COLUMN IF EXISTS positive_examples,
  DROP COLUMN IF EXISTS negative_examples,
  DROP COLUMN IF EXISTS workflow;

DROP TABLE IF EXISTS tool_registry;

COMMIT;

SELECT skill_id, version, status, enabled, allowed_tools
FROM skill
ORDER BY skill_id, version;
