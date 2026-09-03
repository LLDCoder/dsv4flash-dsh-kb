BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM skill
    WHERE skill_id = 'admin_dashboard_my_tasks'
      AND version = 1
  ) THEN
    RAISE EXCEPTION 'admin_dashboard_my_tasks v1 already exists';
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
) VALUES (
  'admin_dashboard_my_tasks',
  'Admin Dashboard My Tasks reader',
  1,
  'ops',
  'PUBLISHED',
  'system',
  TRUE,
  '["admin.dashboard.get-dashboard-enquiry-tasks"]'::jsonb,
  '[]'::jsonb,
  'admin_dashboard',
  '["my tasks", "my task", "current tasks", "current task list", "my to-do", "my to do", "to-do list", "tasks I need to complete"]'::jsonb,
  '["What tasks do I currently need to complete?", "Show my current tasks.", "What are my to-do items?"]'::jsonb,
  '["Show my Content tasks.", "Approve my next task."]'::jsonb,
  $json$
  {
    "routing": {
      "defaultIntentId": "my_tasks",
      "intents": [
        {
          "id": "my_tasks",
          "description": "Read the authenticated Admin user's Dashboard My Tasks list."
        }
      ]
    },
    "defaultToolRequest": {
      "toolName": "admin.dashboard.get-dashboard-enquiry-tasks",
      "arguments": {}
    },
    "deterministicRouting": [
      {
        "priority": 1200,
        "patterns": ["\\bwhat\\s+tasks?\\s+(?:do\\s+i|i)\\s+(?:currently\\s+)?need\\s+to\\s+complete\\b"],
        "noneTerms": [
          "licensing",
          "license",
          "content",
          "inspection",
          "customer happiness",
          "approve",
          "reject",
          "assign",
          "reassign",
          "transfer",
          "resolve",
          "export",
          "download",
          "upload",
          "delete",
          "cancel",
          "create",
          "update",
          "change"
        ],
        "route": {
          "category": "api_call",
          "mode": "answer",
          "routingLocked": true
        }
      },
      {
        "priority": 1200,
        "patterns": ["\\b(?:show|list|tell\\s+me)\\s+(?:my\\s+)?(?:current\\s+)?tasks?\\b"],
        "noneTerms": [
          "licensing",
          "license",
          "content",
          "inspection",
          "customer happiness",
          "approve",
          "reject",
          "assign",
          "reassign",
          "transfer",
          "resolve",
          "export",
          "download",
          "upload",
          "delete",
          "cancel",
          "create",
          "update",
          "change"
        ],
        "route": {
          "category": "api_call",
          "mode": "answer",
          "routingLocked": true
        }
      },
      {
        "priority": 1200,
        "patterns": ["\\bwhat\\s+(?:are\\s+)?my\\s+(?:current\\s+)?tasks?\\b"],
        "noneTerms": [
          "licensing",
          "license",
          "content",
          "inspection",
          "customer happiness",
          "approve",
          "reject",
          "assign",
          "reassign",
          "transfer",
          "resolve",
          "export",
          "download",
          "upload",
          "delete",
          "cancel",
          "create",
          "update",
          "change"
        ],
        "route": {
          "category": "api_call",
          "mode": "answer",
          "routingLocked": true
        }
      },
      {
        "priority": 1200,
        "patterns": ["\\b(?:show|list|what\\s+are)\\s+(?:my\\s+)?to[\\s-]?do(?:\\s+list)?\\b"],
        "noneTerms": [
          "licensing",
          "license",
          "content",
          "inspection",
          "customer happiness",
          "approve",
          "reject",
          "assign",
          "reassign",
          "transfer",
          "resolve",
          "export",
          "download",
          "upload",
          "delete",
          "cancel",
          "create",
          "update",
          "change"
        ],
        "route": {
          "category": "api_call",
          "mode": "answer",
          "routingLocked": true
        }
      }
    ]
  }
  $json$::jsonb,
  'WHEN TO USE: Read the authenticated Admin user''s unqualified Dashboard My Tasks list, including questions such as What tasks do I currently need to complete?\nDO NOT USE WHEN: A department is explicitly named, another Dashboard section is requested, or the user asks to approve, assign, reassign, transfer, resolve, export, download, upload, delete, or otherwise change a task.\nPREREQUISITES: A trusted Admin Portal principal and the token-scoped Dashboard task Tool.\nRESPONSE RULES: Use only the Tool result. Do not search general knowledge, infer tasks, call another department''s endpoint, or change Portal data. Report an authorized empty or denied result as returned.',
  'codex-admin-dashboard-my-tasks',
  now()
);

COMMIT;
