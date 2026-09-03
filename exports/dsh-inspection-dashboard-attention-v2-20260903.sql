BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM skill
    WHERE skill_id = 'admin_inspection_dashboard_reader'
      AND version = 2
  ) THEN
    RAISE EXCEPTION 'admin_inspection_dashboard_reader v2 already exists';
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
  'Inspection dashboard reader',
  2,
  source,
  status,
  scope,
  enabled,
  '["admin.inspectiondashboard.get-inspection-dashboard-overview", "admin.inspectiondashboard.get-inspection-dashboard-tasklist"]'::jsonb,
  dependencies,
  domain,
  '["inspection dashboard", "inspection workload", "inspection task overview", "tasks needing attention", "what tasks need my attention", "what should I focus on"]'::jsonb,
  '["What tasks need my attention?", "What should I focus on today?", "Show the Inspection Tasks that need attention.", "Show the Other Tasks that need attention."]'::jsonb,
  '["Show the details for the first task.", "Assign a task to an inspector.", "Show Content tasks needing attention."]'::jsonb,
  $json$
  {
    "routing": {
      "defaultIntentId": "attention_overview",
      "intents": [
        {
          "id": "attention_overview",
          "description": "Read only the Inspection Dashboard Needs Your Attention counts for Inspection Tasks, Other Tasks, and Total."
        },
        {
          "id": "attention_inspection",
          "description": "List the Inspection Tasks in Needs Your Attention after the user explicitly requests that category."
        },
        {
          "id": "attention_other",
          "description": "List the Other Tasks in Needs Your Attention after the user explicitly requests that category."
        },
        {
          "id": "overview",
          "description": "Read the broader authenticated Inspection dashboard overview when the user explicitly asks for it."
        }
      ],
      "filters": {
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "Maximum number of attention rows to return."
        },
        "dateRange": {
          "type": "date_range",
          "description": "Inclusive Dashboard reporting range in ISO dates."
        }
      }
    },
    "requests": [
      {
        "intentId": "attention_overview",
        "toolName": "admin.inspectiondashboard.get-inspection-dashboard-overview",
        "arguments": {
          "departmentId": 6,
          "sections": "needsAttentionSummary",
          "attentionPageIndex": 1,
          "attentionPageSize": 10
        },
        "bindings": [
          {"filter": "dateRange.start", "argument": "startDate"},
          {"filter": "dateRange.end", "argument": "endDate"}
        ]
      },
      {
        "intentId": "attention_inspection",
        "toolName": "admin.inspectiondashboard.get-inspection-dashboard-tasklist",
        "arguments": {
          "departmentId": 6,
          "listType": "needsAttentionInspection",
          "pageIndex": 1,
          "pageSize": 10
        },
        "bindings": [
          {"filter": "dateRange.start", "argument": "lastUpdatedFrom"},
          {"filter": "dateRange.end", "argument": "lastUpdatedTo"},
          {"filter": "limit", "argument": "pageSize"}
        ]
      },
      {
        "intentId": "attention_other",
        "toolName": "admin.inspectiondashboard.get-inspection-dashboard-tasklist",
        "arguments": {
          "departmentId": 6,
          "listType": "needsAttentionOther",
          "pageIndex": 1,
          "pageSize": 10
        },
        "bindings": [
          {"filter": "dateRange.start", "argument": "lastUpdatedFrom"},
          {"filter": "dateRange.end", "argument": "lastUpdatedTo"},
          {"filter": "limit", "argument": "pageSize"}
        ]
      },
      {
        "intentId": "overview",
        "toolName": "admin.inspectiondashboard.get-inspection-dashboard-overview",
        "arguments": {
          "departmentId": 6,
          "sections": "todoCards,taskHub,performance,membersNeedingCoaching,membersOnEmergencyLeave,needsAttentionSummary",
          "recentPageIndex": 1,
          "recentPageSize": 10,
          "attentionPageIndex": 1,
          "attentionPageSize": 10
        },
        "bindings": [
          {"filter": "dateRange.start", "argument": "startDate"},
          {"filter": "dateRange.end", "argument": "endDate"},
          {"filter": "limit", "argument": "attentionPageSize"}
        ]
      }
    ],
    "defaultToolRequest": {
      "toolName": "admin.inspectiondashboard.get-inspection-dashboard-overview",
      "arguments": {"departmentId": 6, "sections": "needsAttentionSummary", "attentionPageIndex": 1, "attentionPageSize": 10}
    },
    "deterministicIntentRules": [
      {
        "when": {"anyTerms": ["other tasks", "other task"]},
        "intentId": "attention_other"
      },
      {
        "when": {"allTerms": ["inspection", "task"]},
        "intentId": "attention_inspection"
      },
      {
        "when": {"anyTerms": ["dashboard overview", "inspection dashboard", "inspection workload"]},
        "intentId": "overview"
      }
    ],
    "followUpRouting": [
      {"when": {"anyTerms": ["inspection tasks", "inspection task", "other tasks", "other task"]}}
    ],
    "deterministicRouting": [
      {
        "priority": 1300,
        "patterns": ["\\bwhat\\s+(?:tasks?|work|items?)\\s+(?:do\\s+i\\s+)?need\\s+(?:my\\s+)?attention\\b"],
        "noneTerms": ["licensing", "license", "content", "customer happiness", "approve", "reject", "assign", "reassign", "transfer", "resolve", "export", "download", "upload", "delete", "cancel", "create", "update", "change"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      },
      {
        "priority": 1300,
        "patterns": ["\\bwhat\\s+should\\s+i\\s+focus\\s+on\\b", "\\b(?:show|summari[sz]e|break\\s+down)\\s+(?:my\\s+)?(?:tasks?|work|items?)\\s+(?:that\\s+)?need\\s+(?:my\\s+)?attention\\b"],
        "noneTerms": ["licensing", "license", "content", "customer happiness", "approve", "reject", "assign", "reassign", "transfer", "resolve", "export", "download", "upload", "delete", "cancel", "create", "update", "change"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      },
      {
        "priority": 1300,
        "patterns": ["\\b(?:show|list)\\s+(?:the\\s+)?(?:inspection\\s+tasks?|other\\s+tasks?)\\s+(?:that\\s+)?need\\s+(?:my\\s+)?attention\\b"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      },
      {
        "priority": 1200,
        "patterns": ["\\b(?:my\\s+)?inspection\\s+dashboard\\b", "\\binspection\\s+(?:dashboard|workload|task)\\s+(?:overview|summary)\\b"],
        "route": {"category": "api_call", "mode": "answer", "routingLocked": true}
      }
    ]
  }
  $json$::jsonb,
  'WHEN TO USE: Read the authenticated Inspection leader''s Dashboard Needs Your Attention information. For an unqualified attention or focus question, call the Overview Tool with only needsAttentionSummary and report Inspection Tasks, Other Tasks, and Total counts. Only after the user explicitly names Inspection Tasks or Other Tasks may the assistant call the corresponding TaskList. DO NOT USE WHEN: The user selects an individual record, asks for a task or violation detail, requests another department, asks for policy guidance only, or requests any mutation. RESPONSE RULES: Use only live Tool results. Do not substitute general knowledge. Preserve the selected date range on a category follow-up. Other Tasks can contain Enquiries, Violations, Appeals, and Refunds; do not use the Inspection task-detail Tool for an Other Task without a separately declared entity mapping.',
  'codex-admin-inspection-dashboard-attention-v2',
  now()
FROM skill
WHERE skill_id = 'admin_inspection_dashboard_reader'
  AND version = 1;

COMMIT;
