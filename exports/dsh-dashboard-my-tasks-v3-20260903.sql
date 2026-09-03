BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM skill
    WHERE skill_id = 'admin_dashboard_my_tasks'
      AND version = 3
  ) THEN
    RAISE EXCEPTION 'admin_dashboard_my_tasks v3 already exists';
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
  'Licensing Dashboard My Tasks reader',
  3,
  source,
  status,
  scope,
  enabled,
  '["admin.licensedashboard.get-license-dashboard-overview"]'::jsonb,
  dependencies,
  domain,
  '["my tasks", "my task", "current tasks", "current task list", "my to-do", "my to do", "to-do list", "tasks I need to complete", "dashboard tasks"]'::jsonb,
  '["What tasks do I currently need to complete?", "Show my current tasks.", "What are my to-do items?"]'::jsonb,
  '["Show my Content tasks.", "Approve my next task."]'::jsonb,
  $json$
  {
    "routing": {
      "defaultIntentId": "overview",
      "intents": [
        {
          "id": "overview",
          "description": "Read all Licensing Dashboard My Tasks tab counts and the default Service Application priority cards."
        },
        {
          "id": "category",
          "description": "Read the selected Licensing Dashboard My Tasks category priority cards."
        }
      ],
      "filters": {
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "Maximum number of priority cards to return."
        },
        "taskCategory": {
          "type": "enum",
          "description": "The Licensing Dashboard My Tasks tab selected by the user.",
          "options": [
            {"id": "service_application", "value": 0, "label": "service application"},
            {"id": "profile_verification", "value": 1, "label": "profile verification"},
            {"id": "enquiries", "value": 2, "label": "enquiries & complaints", "name": "complaints"},
            {"id": "refunds", "value": 3, "label": "refunds"},
            {"id": "appeals", "value": 4, "label": "appeals"}
          ]
        }
      }
    },
    "requests": [
      {
        "intentId": "overview",
        "toolName": "admin.licensedashboard.get-license-dashboard-overview",
        "arguments": {"Scope": 0, "TaskCategory": 0, "PriorityCardCount": 10},
        "bindings": [
          {"filter": "limit", "argument": "PriorityCardCount"}
        ]
      },
      {
        "intentId": "category",
        "toolName": "admin.licensedashboard.get-license-dashboard-overview",
        "arguments": {"Scope": 0, "PriorityCardCount": 10},
        "bindings": [
          {"filter": "taskCategory", "argument": "TaskCategory"},
          {"filter": "limit", "argument": "PriorityCardCount"}
        ]
      }
    ],
    "defaultToolRequest": {
      "toolName": "admin.licensedashboard.get-license-dashboard-overview",
      "arguments": {"Scope": 0, "TaskCategory": 0, "PriorityCardCount": 10}
    },
    "deterministicIntentRules": [
      {
        "when": {
          "anyTerms": [
            "service application",
            "profile verification",
            "enquiries",
            "complaints",
            "refunds",
            "appeals"
          ]
        },
        "intentId": "category"
      }
    ],
    "followUpRouting": [
      {
        "when": {
          "anyTerms": [
            "service application",
            "profile verification",
            "enquiries",
            "complaints",
            "refunds",
            "appeals"
          ]
        }
      }
    ],
    "deterministicRouting": [
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
  }
  $json$::jsonb,
  'WHEN TO USE: Read the authenticated Licensing user''s unqualified Dashboard My Tasks overview, including questions such as What tasks do I currently need to complete? The overview must report taskTabCounts for Service Application, Profile Verification, Enquiries, Refunds, and Appeals. When the user follows up with one of those categories, read only that category''s priorityCards. DO NOT USE WHEN: A different department is explicitly named, another Dashboard section is requested, or the user asks to approve, assign, reassign, transfer, resolve, export, download, upload, delete, or otherwise change a task. PREREQUISITES: A trusted Licensing principal and the token-scoped Licensing Dashboard overview Tool. RESPONSE RULES: Use only the Tool result. For an overview, state every returned tab count before mentioning the default priority cards. For a category follow-up, state that category and show only its returned priority cards. Do not call the Enquiry-only Dashboard endpoint, infer records, query another department, or change Portal data.',
  'codex-admin-dashboard-my-tasks-v3',
  now()
FROM skill
WHERE skill_id = 'admin_dashboard_my_tasks'
  AND version = 2;

COMMIT;
