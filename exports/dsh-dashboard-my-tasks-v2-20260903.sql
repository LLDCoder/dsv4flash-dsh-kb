BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM skill
    WHERE skill_id = 'admin_dashboard_my_tasks'
      AND version = 2
  ) THEN
    RAISE EXCEPTION 'admin_dashboard_my_tasks v2 already exists';
  END IF;
END $$;

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
  domain,
  aliases,
  positive_examples,
  negative_examples,
  workflow,
  content,
  updated_by,
  updated_at
)
SELECT
  skill_id,
  name,
  2,
  source,
  status,
  scope,
  enabled,
  allowed_tools,
  dependencies,
  domain,
  aliases,
  positive_examples,
  negative_examples,
  jsonb_set(
    workflow,
    '{deterministicRouting}',
    $json$
    [
      {
        "priority": 1200,
        "patterns": ["\\bwhat\\s+tasks?\\s+(?:do\\s+i|i)\\s+(?:currently\\s+)?need\\s+to\\s+complete\\b"],
        "noneTerms": ["licensing", "license", "content", "inspection", "customer happiness", "approve", "reject", "assign", "reassign", "transfer", "resolve", "export", "download", "upload", "delete", "cancel", "create", "update", "change"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      },
      {
        "priority": 1200,
        "patterns": ["\\b(?:show|list|tell\\s+me)\\s+(?:my\\s+)?(?:current\\s+)?tasks?\\b"],
        "noneTerms": ["licensing", "license", "content", "inspection", "customer happiness", "approve", "reject", "assign", "reassign", "transfer", "resolve", "export", "download", "upload", "delete", "cancel", "create", "update", "change"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      },
      {
        "priority": 1200,
        "patterns": ["\\bwhat\\s+(?:are\\s+)?my\\s+(?:current\\s+)?tasks?\\b"],
        "noneTerms": ["licensing", "license", "content", "inspection", "customer happiness", "approve", "reject", "assign", "reassign", "transfer", "resolve", "export", "download", "upload", "delete", "cancel", "create", "update", "change"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      },
      {
        "priority": 1200,
        "patterns": ["\\b(?:show|list|what\\s+are)\\s+(?:my\\s+)?to[\\s-]?do(?:\\s+list)?\\b"],
        "noneTerms": ["licensing", "license", "content", "inspection", "customer happiness", "approve", "reject", "assign", "reassign", "transfer", "resolve", "export", "download", "upload", "delete", "cancel", "create", "update", "change"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      }
    ]
    $json$::jsonb,
    true
  ),
  content,
  'codex-admin-dashboard-my-tasks-v2',
  now()
FROM skill
WHERE skill_id = 'admin_dashboard_my_tasks'
  AND version = 1;

COMMIT;
