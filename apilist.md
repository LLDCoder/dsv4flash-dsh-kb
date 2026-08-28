# 77 UMC Platform API List

> 本文档由 DSH 从 77 测试服务器的 Swagger/OpenAPI 文档自动生成，供知识库管理员导入和维护 API 清单。
> 这是接口定义快照，不代表 DSH 当前已开放全部接口；调用权限、租户隔离和业务写入规则仍以服务端校验为准。

## 快照信息

- 来源 Swagger：`http://77.242.240.158:18085/api/platform/api/v1/openapi.json`
- 建议 Base URL：`http://77.242.240.158:18085/api/platform`
- OpenAPI：`3.1.0`
- 服务：`FF AI Platform`，版本 `0.1.0`
- 生成时间：`2026-08-28T16:55:22+08:00`
- 统计：369 个路径，566 个操作，369 个 Schema
- OpenAPI 原文 SHA-256：`2dc493c23be0f5a98611011f9abe9e787a29a540d41c1f28ed1ca2cee98ea72d`

## 使用与鉴权说明

- 默认应携带 `Authorization: Bearer <UMC 或平台访问令牌>`；令牌获取方式和实际权限由 77 平台统一控制。
- 本快照包含登录、用户、租户、管理员、运行时、插件、部署、数据接入和 AI 相关接口。管理员应依据租户权限和发布策略决定哪些接口进入知识库可调用清单。
- `POST`、`PUT`、`PATCH`、`DELETE` 接口可能产生数据变更；在 DSH Tool 注册前应确认幂等性、审批和测试环境限制。

### Swagger 定义的安全方案

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `OAuth2PasswordBearer` | `oauth2` | oauth2；flows: password；tokenUrl: `/api/v1/login/access-token` |
| `HTTPBearer` | `http` | bearer |

## 接口总表

| # | Tag | Method | Path | Operation ID | Summary | Auth |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | my-request | `POST` | `/api/MyRequest/ApplicationPage` | `my-request-get_application_page` | List mock service applications | 未声明 |
| 2 | task-portal | `GET` | `/api/admin/agents/lifecycle-candidates/hot` | `task-portal-list_hot_lifecycle_candidates` | List Hot Lifecycle Candidates | OAuth2PasswordBearer |
| 3 | task-portal | `GET` | `/api/admin/agents/lifecycle-candidates/idle` | `task-portal-list_idle_lifecycle_candidates` | List Idle Lifecycle Candidates | OAuth2PasswordBearer |
| 4 | task-portal | `POST` | `/api/admin/agents/{agent_id}/demote` | `task-portal-demote_admin_agent` | Demote Admin Agent | OAuth2PasswordBearer |
| 5 | task-portal | `POST` | `/api/admin/agents/{agent_id}/promote` | `task-portal-promote_admin_agent` | Promote Admin Agent | OAuth2PasswordBearer |
| 6 | task-portal | `GET` | `/api/admin/metrics/overview` | `task-portal-get_admin_metrics_overview` | Get Admin Metrics Overview | OAuth2PasswordBearer |
| 7 | task-portal | `GET` | `/api/admin/skills` | `task-portal-list_admin_skills` | List Admin Skills | OAuth2PasswordBearer |
| 8 | task-portal | `POST` | `/api/admin/skills` | `task-portal-create_admin_skill` | Create Admin Skill | OAuth2PasswordBearer |
| 9 | task-portal | `GET` | `/api/admin/skills/{skill_id}` | `task-portal-get_admin_skill_detail` | Get Admin Skill Detail | OAuth2PasswordBearer |
| 10 | task-portal | `PUT` | `/api/admin/skills/{skill_id}` | `task-portal-update_admin_skill` | Update Admin Skill | OAuth2PasswordBearer |
| 11 | task-portal | `DELETE` | `/api/admin/skills/{skill_id}` | `task-portal-delete_admin_skill` | Delete Admin Skill | OAuth2PasswordBearer |
| 12 | task-portal | `GET` | `/api/admin/tasks` | `task-portal-list_admin_tasks` | List Admin Tasks | OAuth2PasswordBearer |
| 13 | task-portal | `GET` | `/api/admin/tasks/stats` | `task-portal-get_admin_task_stats` | Get Admin Task Stats | OAuth2PasswordBearer |
| 14 | task-portal | `POST` | `/api/admin/tasks/{task_id}/reject` | `task-portal-reject_admin_task` | Reject Admin Task | OAuth2PasswordBearer |
| 15 | task-portal | `POST` | `/api/admin/tasks/{task_id}/reprompt` | `task-portal-reprompt_admin_task` | Reprompt Admin Task | OAuth2PasswordBearer |
| 16 | task-portal | `GET` | `/api/admin/tasks/{task_id}/snapshot` | `task-portal-get_admin_task_snapshot` | Get Admin Task Snapshot | OAuth2PasswordBearer |
| 17 | agent-conversations | `GET` | `/api/conversations` | `agent-conversations-list_conversations` | List Conversations | OAuth2PasswordBearer |
| 18 | agent-conversations | `POST` | `/api/conversations` | `agent-conversations-create_conversation` | Create Conversation | OAuth2PasswordBearer |
| 19 | agent-conversations | `GET` | `/api/conversations/{conversation_id}` | `agent-conversations-get_conversation` | Get Conversation | OAuth2PasswordBearer |
| 20 | agent-conversations | `DELETE` | `/api/conversations/{conversation_id}` | `agent-conversations-delete_conversation` | Delete Conversation | OAuth2PasswordBearer |
| 21 | agent-conversations | `GET` | `/api/conversations/{conversation_id}/messages` | `agent-conversations-get_conversation_messages` | Get Conversation Messages | OAuth2PasswordBearer |
| 22 | agent-conversations | `POST` | `/api/conversations/{conversation_id}/messages` | `agent-conversations-update_conversation_messages` | Update Conversation Messages | OAuth2PasswordBearer |
| 23 | agent-conversations | `GET` | `/api/conversations/{conversation_id}/pending-task-confirmation` | `agent-conversations-get_pending_task_confirmation` | Get Pending Task Confirmation | OAuth2PasswordBearer |
| 24 | task-portal | `GET` | `/api/tasks/{task_id}/data` | `task-portal-get_task_widget_data` | Get Task Widget Data | OAuth2PasswordBearer |
| 25 | task-portal | `GET` | `/api/tasks/{task_id}/deployment` | `task-portal-get_task_deployment` | Get Task Deployment | OAuth2PasswordBearer |
| 26 | task-portal | `POST` | `/api/tasks/{task_id}/deployment/rebuild-static` | `task-portal-rebuild_task_static_deployment` | Rebuild Task Static Deployment | OAuth2PasswordBearer |
| 27 | task-portal | `GET` | `/api/tasks/{task_id}/layout` | `task-portal-get_task_layout` | Get Task Layout | OAuth2PasswordBearer |
| 28 | task-portal | `GET` | `/api/tasks/{task_id}/mock-api` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 29 | task-portal | `POST` | `/api/tasks/{task_id}/mock-api` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 30 | task-portal | `PUT` | `/api/tasks/{task_id}/mock-api` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 31 | task-portal | `PATCH` | `/api/tasks/{task_id}/mock-api` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 32 | task-portal | `DELETE` | `/api/tasks/{task_id}/mock-api` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 33 | task-portal | `OPTIONS` | `/api/tasks/{task_id}/mock-api` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 34 | task-portal | `HEAD` | `/api/tasks/{task_id}/mock-api` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 35 | task-portal | `GET` | `/api/tasks/{task_id}/mock-api/{subpath}` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 36 | task-portal | `POST` | `/api/tasks/{task_id}/mock-api/{subpath}` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 37 | task-portal | `PUT` | `/api/tasks/{task_id}/mock-api/{subpath}` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 38 | task-portal | `PATCH` | `/api/tasks/{task_id}/mock-api/{subpath}` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 39 | task-portal | `DELETE` | `/api/tasks/{task_id}/mock-api/{subpath}` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 40 | task-portal | `OPTIONS` | `/api/tasks/{task_id}/mock-api/{subpath}` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 41 | task-portal | `HEAD` | `/api/tasks/{task_id}/mock-api/{subpath}` | `task-portal-task_mock_api` | Task Mock Api | 未声明 |
| 42 | task-portal | `GET` | `/api/tasks/{task_id}/ppt/download` | `task-portal-download_task_ppt` | Download the PPTX artifact generated by a PPT work order | OAuth2PasswordBearer |
| 43 | task-portal | `GET` | `/api/tasks/{task_id}/preview` | `task-portal-preview_task_output` | Preview Task Output | OAuth2PasswordBearer |
| 44 | task-portal | `GET` | `/api/tasks/{task_id}/preview/api/{runtime_path}` | `task-portal-proxy_task_preview_api` | Proxy Task Preview Api | 未声明 |
| 45 | task-portal | `POST` | `/api/tasks/{task_id}/preview/api/{runtime_path}` | `task-portal-proxy_task_preview_api` | Proxy Task Preview Api | 未声明 |
| 46 | task-portal | `PUT` | `/api/tasks/{task_id}/preview/api/{runtime_path}` | `task-portal-proxy_task_preview_api` | Proxy Task Preview Api | 未声明 |
| 47 | task-portal | `PATCH` | `/api/tasks/{task_id}/preview/api/{runtime_path}` | `task-portal-proxy_task_preview_api` | Proxy Task Preview Api | 未声明 |
| 48 | task-portal | `DELETE` | `/api/tasks/{task_id}/preview/api/{runtime_path}` | `task-portal-proxy_task_preview_api` | Proxy Task Preview Api | 未声明 |
| 49 | task-portal | `OPTIONS` | `/api/tasks/{task_id}/preview/api/{runtime_path}` | `task-portal-proxy_task_preview_api` | Proxy Task Preview Api | 未声明 |
| 50 | task-portal | `POST` | `/api/tasks/{task_id}/preview/errors` | `task-portal-report_task_preview_error` | Report Task Preview Error | 未声明 |
| 51 | task-portal | `GET` | `/api/tasks/{task_id}/preview/{file_path}` | `task-portal-preview_task_output` | Preview Task Output | OAuth2PasswordBearer |
| 52 | task-portal | `DELETE` | `/api/tasks/{task_id}/project` | `task-portal-delete_task_project` | Delete Task Project | OAuth2PasswordBearer |
| 53 | task-portal | `POST` | `/api/tasks/{task_id}/project/start` | `task-portal-start_task_project` | Start Task Project | OAuth2PasswordBearer |
| 54 | task-portal | `POST` | `/api/tasks/{task_id}/project/stop` | `task-portal-stop_task_project` | Stop Task Project | OAuth2PasswordBearer |
| 55 | task-portal | `GET` | `/api/tasks/{task_id}/runtime/{runtime_path}` | `task-portal-call_task_runtime_api` | Call Task Runtime Api | 未声明 |
| 56 | task-portal | `POST` | `/api/tasks/{task_id}/runtime/{runtime_path}` | `task-portal-call_task_runtime_api` | Call Task Runtime Api | 未声明 |
| 57 | task-portal | `PUT` | `/api/tasks/{task_id}/runtime/{runtime_path}` | `task-portal-call_task_runtime_api` | Call Task Runtime Api | 未声明 |
| 58 | task-portal | `PATCH` | `/api/tasks/{task_id}/runtime/{runtime_path}` | `task-portal-call_task_runtime_api` | Call Task Runtime Api | 未声明 |
| 59 | task-portal | `DELETE` | `/api/tasks/{task_id}/runtime/{runtime_path}` | `task-portal-call_task_runtime_api` | Call Task Runtime Api | 未声明 |
| 60 | task-portal | `OPTIONS` | `/api/tasks/{task_id}/runtime/{runtime_path}` | `task-portal-call_task_runtime_api` | Call Task Runtime Api | 未声明 |
| 61 | task-portal | `GET` | `/api/tenant/agents` | `task-portal-list_tenant_agents` | List Tenant Agents | OAuth2PasswordBearer |
| 62 | task-portal | `GET` | `/api/tenant/agents/{agent_id}` | `task-portal-get_tenant_agent_detail` | Get Tenant Agent Detail | OAuth2PasswordBearer |
| 63 | task-portal | `PUT` | `/api/tenant/agents/{agent_id}/budget` | `task-portal-update_tenant_agent_budget` | Update Tenant Agent Budget | OAuth2PasswordBearer |
| 64 | task-portal | `GET` | `/api/tenant/apps` | `task-portal-list_tenant_app_menu` | List Tenant App Menu | OAuth2PasswordBearer |
| 65 | task-portal | `POST` | `/api/tenant/apps` | `task-portal-create_tenant_app_menu_node` | Create Tenant App Menu Node | OAuth2PasswordBearer |
| 66 | task-portal | `DELETE` | `/api/tenant/apps/{agent_id}` | `task-portal-delete_tenant_app_menu_node` | Delete Tenant App Menu Node | OAuth2PasswordBearer |
| 67 | task-portal | `GET` | `/api/tenant/backend-services/swagger-docs` | `task-portal-list_tenant_backend_swagger_docs` | List Tenant Backend Swagger Docs | OAuth2PasswordBearer |
| 68 | task-portal | `GET` | `/api/tenant/billing/balance` | `task-portal-get_tenant_billing_balance` | Get Tenant Billing Balance | OAuth2PasswordBearer |
| 69 | task-portal | `GET` | `/api/tenant/billing/records` | `task-portal-list_tenant_billing_records` | List Tenant Billing Records | OAuth2PasswordBearer |
| 70 | task-portal | `GET` | `/api/tenant/billing/records/{record_id}` | `task-portal-get_tenant_billing_record_detail` | Get Tenant Billing Record Detail | OAuth2PasswordBearer |
| 71 | task-portal | `GET` | `/api/tenant/deployments` | `task-portal-list_tenant_deployments` | List Tenant Deployments | OAuth2PasswordBearer |
| 72 | task-portal | `GET` | `/api/tenant/tasks` | `task-portal-list_tenant_tasks` | List Tenant Tasks | OAuth2PasswordBearer |
| 73 | data-ingestion-proxy | `GET` | `/api/v1/access-endpoints` | `data-ingestion-proxy-proxy_access_endpoints_root` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 74 | data-ingestion-proxy | `POST` | `/api/v1/access-endpoints` | `data-ingestion-proxy-proxy_access_endpoints_root` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 75 | data-ingestion-proxy | `PUT` | `/api/v1/access-endpoints` | `data-ingestion-proxy-proxy_access_endpoints_root` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 76 | data-ingestion-proxy | `PATCH` | `/api/v1/access-endpoints` | `data-ingestion-proxy-proxy_access_endpoints_root` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 77 | data-ingestion-proxy | `DELETE` | `/api/v1/access-endpoints` | `data-ingestion-proxy-proxy_access_endpoints_root` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 78 | data-ingestion-proxy | `OPTIONS` | `/api/v1/access-endpoints` | `data-ingestion-proxy-proxy_access_endpoints_root` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 79 | data-ingestion-proxy | `HEAD` | `/api/v1/access-endpoints` | `data-ingestion-proxy-proxy_access_endpoints_root` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 80 | data-ingestion-proxy | `GET` | `/api/v1/access-endpoints/{path}` | `data-ingestion-proxy-proxy_access_endpoints` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 81 | data-ingestion-proxy | `POST` | `/api/v1/access-endpoints/{path}` | `data-ingestion-proxy-proxy_access_endpoints` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 82 | data-ingestion-proxy | `PUT` | `/api/v1/access-endpoints/{path}` | `data-ingestion-proxy-proxy_access_endpoints` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 83 | data-ingestion-proxy | `PATCH` | `/api/v1/access-endpoints/{path}` | `data-ingestion-proxy-proxy_access_endpoints` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 84 | data-ingestion-proxy | `DELETE` | `/api/v1/access-endpoints/{path}` | `data-ingestion-proxy-proxy_access_endpoints` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 85 | data-ingestion-proxy | `OPTIONS` | `/api/v1/access-endpoints/{path}` | `data-ingestion-proxy-proxy_access_endpoints` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 86 | data-ingestion-proxy | `HEAD` | `/api/v1/access-endpoints/{path}` | `data-ingestion-proxy-proxy_access_endpoints` | Proxy access endpoint requests to data_ingestion | OAuth2PasswordBearer |
| 87 | grc | `GET` | `/api/v1/admin/grc/agents/{agent_id}/monitor` | `grc-get_agent_monitor` | Get Agent Monitor | OAuth2PasswordBearer |
| 88 | grc | `POST` | `/api/v1/admin/grc/agents/{agent_id}/monitors` | `grc-start_agent_monitor` | Start Agent Monitor | OAuth2PasswordBearer |
| 89 | grc | `GET` | `/api/v1/admin/grc/agents/{agent_id}/release-status` | `grc-get_agent_release_status` | Get Agent Release Status | OAuth2PasswordBearer |
| 90 | grc | `GET` | `/api/v1/admin/grc/audit-events` | `grc-list_audit_events` | List Audit Events | OAuth2PasswordBearer |
| 91 | grc | `GET` | `/api/v1/admin/grc/audit-events/verify-chain` | `grc-verify_audit_chain` | Verify Audit Chain | OAuth2PasswordBearer |
| 92 | grc | `GET` | `/api/v1/admin/grc/audit-events/{event_id}` | `grc-get_audit_event` | Get Audit Event | OAuth2PasswordBearer |
| 93 | grc | `GET` | `/api/v1/admin/grc/dashboard/overview` | `grc-get_dashboard_overview` | Get Dashboard Overview | OAuth2PasswordBearer |
| 94 | grc | `GET` | `/api/v1/admin/grc/evaluations` | `grc-list_evaluations` | List Evaluations | OAuth2PasswordBearer |
| 95 | grc | `POST` | `/api/v1/admin/grc/evaluations` | `grc-run_evaluation` | Run Evaluation | OAuth2PasswordBearer |
| 96 | grc | `GET` | `/api/v1/admin/grc/evaluations/{evaluation_id}` | `grc-get_evaluation` | Get Evaluation | OAuth2PasswordBearer |
| 97 | grc | `POST` | `/api/v1/admin/grc/evaluations/{evaluation_id}/rerun` | `grc-rerun_evaluation` | Rerun Evaluation | OAuth2PasswordBearer |
| 98 | grc | `GET` | `/api/v1/admin/grc/evaluations/{evaluation_id}/results` | `grc-get_evaluation_results` | Get Evaluation Results | OAuth2PasswordBearer |
| 99 | grc | `GET` | `/api/v1/admin/grc/exceptions` | `grc-list_exceptions` | List Exceptions | OAuth2PasswordBearer |
| 100 | grc | `POST` | `/api/v1/admin/grc/exceptions/{exception_id}/approve` | `grc-approve_exception` | Approve Exception | OAuth2PasswordBearer |
| 101 | grc | `POST` | `/api/v1/admin/grc/exceptions/{exception_id}/reject` | `grc-reject_exception` | Reject Exception | OAuth2PasswordBearer |
| 102 | grc | `POST` | `/api/v1/admin/grc/exceptions/{exception_id}/revoke` | `grc-revoke_exception` | Revoke Exception | OAuth2PasswordBearer |
| 103 | grc | `GET` | `/api/v1/admin/grc/monitors` | `grc-list_monitors` | List Monitors | OAuth2PasswordBearer |
| 104 | grc | `POST` | `/api/v1/admin/grc/monitors/check-due` | `grc-trigger_due_checks` | Trigger Due Checks | OAuth2PasswordBearer |
| 105 | grc | `POST` | `/api/v1/admin/grc/monitors/{monitor_id}/acknowledge` | `grc-acknowledge_monitor_anomaly` | Acknowledge Monitor Anomaly | OAuth2PasswordBearer |
| 106 | grc | `POST` | `/api/v1/admin/grc/monitors/{monitor_id}/stop` | `grc-stop_agent_monitor` | Stop Agent Monitor | OAuth2PasswordBearer |
| 107 | grc | `GET` | `/api/v1/admin/grc/reports/compliance-trend` | `grc-report_compliance_trend` | Report Compliance Trend | OAuth2PasswordBearer |
| 108 | grc | `GET` | `/api/v1/admin/grc/reports/exceptions` | `grc-report_exceptions` | Report Exceptions | OAuth2PasswordBearer |
| 109 | grc | `POST` | `/api/v1/admin/grc/reports/exports` | `grc-export_report` | Export Report | OAuth2PasswordBearer |
| 110 | grc | `GET` | `/api/v1/admin/grc/reports/exports/{job_id}` | `grc-get_export_status` | Get Export Status | OAuth2PasswordBearer |
| 111 | grc | `GET` | `/api/v1/admin/grc/reports/review-sla` | `grc-report_review_sla` | Report Review Sla | OAuth2PasswordBearer |
| 112 | grc | `GET` | `/api/v1/admin/grc/reports/risk-distribution` | `grc-report_risk_distribution` | Report Risk Distribution | OAuth2PasswordBearer |
| 113 | grc | `GET` | `/api/v1/admin/grc/reports/rule-hits` | `grc-report_rule_hits` | Report Rule Hits | OAuth2PasswordBearer |
| 114 | grc | `GET` | `/api/v1/admin/grc/reports/treatments` | `grc-report_treatments` | Report Treatments | OAuth2PasswordBearer |
| 115 | grc | `GET` | `/api/v1/admin/grc/reviews` | `grc-list_reviews` | List Reviews | OAuth2PasswordBearer |
| 116 | grc | `GET` | `/api/v1/admin/grc/reviews/{case_id}` | `grc-get_review` | Get Review | OAuth2PasswordBearer |
| 117 | grc | `POST` | `/api/v1/admin/grc/reviews/{case_id}/assign` | `grc-assign_review` | Assign Review | OAuth2PasswordBearer |
| 118 | grc | `POST` | `/api/v1/admin/grc/reviews/{case_id}/cancel` | `grc-cancel_review` | Cancel Review | OAuth2PasswordBearer |
| 119 | grc | `GET` | `/api/v1/admin/grc/reviews/{case_id}/decisions` | `grc-list_review_decisions` | List Review Decisions | OAuth2PasswordBearer |
| 120 | grc | `POST` | `/api/v1/admin/grc/reviews/{case_id}/decisions` | `grc-submit_review_decision` | Submit Review Decision | OAuth2PasswordBearer |
| 121 | grc | `POST` | `/api/v1/admin/grc/reviews/{case_id}/evidence` | `grc-attach_review_evidence` | Attach Review Evidence | OAuth2PasswordBearer |
| 122 | grc | `POST` | `/api/v1/admin/grc/reviews/{case_id}/exceptions` | `grc-request_exception` | Request Exception | OAuth2PasswordBearer |
| 123 | grc | `GET` | `/api/v1/admin/grc/reviews/{case_id}/treatments` | `grc-list_review_treatments` | List Review Treatments | OAuth2PasswordBearer |
| 124 | grc | `POST` | `/api/v1/admin/grc/reviews/{case_id}/treatments` | `grc-create_treatment` | Create Treatment | OAuth2PasswordBearer |
| 125 | grc | `GET` | `/api/v1/admin/grc/risk-profiles` | `grc-list_risk_profiles` | List Risk Profiles | OAuth2PasswordBearer |
| 126 | grc | `POST` | `/api/v1/admin/grc/risk-profiles/assess` | `grc-assess_risk_profile` | Assess Risk Profile | OAuth2PasswordBearer |
| 127 | grc | `GET` | `/api/v1/admin/grc/risk-profiles/{profile_id}` | `grc-get_risk_profile` | Get Risk Profile | OAuth2PasswordBearer |
| 128 | grc | `PUT` | `/api/v1/admin/grc/risk-profiles/{profile_id}` | `grc-update_risk_profile` | Update Risk Profile | OAuth2PasswordBearer |
| 129 | grc | `GET` | `/api/v1/admin/grc/rules` | `grc-list_rules` | List Rules | OAuth2PasswordBearer |
| 130 | grc | `POST` | `/api/v1/admin/grc/rules` | `grc-create_rule` | Create Rule | OAuth2PasswordBearer |
| 131 | grc | `POST` | `/api/v1/admin/grc/rules/test` | `grc-test_rule_evaluator` | Test Rule Evaluator | OAuth2PasswordBearer |
| 132 | grc | `POST` | `/api/v1/admin/grc/rules/validate` | `grc-validate_rule_evaluator` | Validate Rule Evaluator | OAuth2PasswordBearer |
| 133 | grc | `GET` | `/api/v1/admin/grc/rules/{rule_id}` | `grc-get_rule` | Get Rule | OAuth2PasswordBearer |
| 134 | grc | `PATCH` | `/api/v1/admin/grc/rules/{rule_id}` | `grc-patch_rule` | Patch Rule | OAuth2PasswordBearer |
| 135 | grc | `GET` | `/api/v1/admin/grc/rules/{rule_id}/stats` | `grc-get_rule_stats` | Get Rule Stats | OAuth2PasswordBearer |
| 136 | grc | `GET` | `/api/v1/admin/grc/rules/{rule_id}/versions` | `grc-list_rule_versions` | List Rule Versions | OAuth2PasswordBearer |
| 137 | grc | `POST` | `/api/v1/admin/grc/rules/{rule_id}/versions` | `grc-create_rule_version` | Create Rule Version | OAuth2PasswordBearer |
| 138 | grc | `POST` | `/api/v1/admin/grc/rules/{rule_id}/versions/{version}/publish` | `grc-publish_rule_version` | Publish Rule Version | OAuth2PasswordBearer |
| 139 | grc | `POST` | `/api/v1/admin/grc/rules/{rule_id}/versions/{version}/retire` | `grc-retire_rule_version` | Retire Rule Version | OAuth2PasswordBearer |
| 140 | grc | `GET` | `/api/v1/admin/grc/treatments` | `grc-list_treatments` | List Treatments | OAuth2PasswordBearer |
| 141 | grc | `PATCH` | `/api/v1/admin/grc/treatments/{treatment_id}` | `grc-update_treatment` | Update Treatment | OAuth2PasswordBearer |
| 142 | grc | `POST` | `/api/v1/admin/grc/treatments/{treatment_id}/close` | `grc-close_treatment` | Close Treatment | OAuth2PasswordBearer |
| 143 | grc | `POST` | `/api/v1/admin/grc/treatments/{treatment_id}/verify` | `grc-verify_treatment` | Verify Treatment | OAuth2PasswordBearer |
| 144 | rbac | `GET` | `/api/v1/admin/menus` | `rbac-read_admin_menus` | Read Admin Menus | OAuth2PasswordBearer |
| 145 | rbac | `GET` | `/api/v1/admin/organizations` | `rbac-read_admin_organizations` | Read Admin Organizations | OAuth2PasswordBearer |
| 146 | rbac | `POST` | `/api/v1/admin/organizations` | `rbac-create_admin_organization` | Create Admin Organization | OAuth2PasswordBearer |
| 147 | rbac | `GET` | `/api/v1/admin/organizations/tree` | `rbac-read_admin_organization_tree` | Read Admin Organization Tree | OAuth2PasswordBearer |
| 148 | rbac | `PATCH` | `/api/v1/admin/organizations/{organization_id}` | `rbac-update_admin_organization` | Update Admin Organization | OAuth2PasswordBearer |
| 149 | rbac | `DELETE` | `/api/v1/admin/organizations/{organization_id}` | `rbac-delete_admin_organization` | Delete Admin Organization | OAuth2PasswordBearer |
| 150 | rbac | `GET` | `/api/v1/admin/permissions` | `rbac-read_admin_permissions` | Read Admin Permissions | OAuth2PasswordBearer |
| 151 | production-approval | `POST` | `/api/v1/admin/production/agents/{agent_id}/rollback` | `production-approval-rollback_production_agent` | Rollback Production Agent | OAuth2PasswordBearer |
| 152 | production-approval | `GET` | `/api/v1/admin/production/approvals` | `production-approval-list_production_approvals` | List Production Approvals | OAuth2PasswordBearer |
| 153 | production-approval | `POST` | `/api/v1/admin/production/approvals` | `production-approval-create_production_approval` | Create Production Approval | OAuth2PasswordBearer |
| 154 | production-approval | `GET` | `/api/v1/admin/production/approvals/{approval_id}` | `production-approval-get_production_approval` | Get Production Approval | OAuth2PasswordBearer |
| 155 | production-approval | `POST` | `/api/v1/admin/production/approvals/{approval_id}/apply` | `production-approval-apply_production_approval` | Apply Production Approval | OAuth2PasswordBearer |
| 156 | production-approval | `POST` | `/api/v1/admin/production/approvals/{approval_id}/cancel` | `production-approval-cancel_production_approval` | Cancel Production Approval | OAuth2PasswordBearer |
| 157 | production-approval | `POST` | `/api/v1/admin/production/approvals/{approval_id}/decisions` | `production-approval-submit_production_decision` | Submit Production Decision | OAuth2PasswordBearer |
| 158 | production-approval | `POST` | `/api/v1/admin/production/approvals/{approval_id}/runtime/refresh` | `production-approval-refresh_runtime_status` | Refresh Runtime Status | OAuth2PasswordBearer |
| 159 | production-approval | `POST` | `/api/v1/admin/production/approvals/{approval_id}/runtime/restart` | `production-approval-restart_runtime_container` | Restart Runtime Container | OAuth2PasswordBearer |
| 160 | production-approval | `POST` | `/api/v1/admin/production/approvals/{approval_id}/runtime/stop` | `production-approval-stop_runtime_container` | Stop Runtime Container | OAuth2PasswordBearer |
| 161 | rbac | `GET` | `/api/v1/admin/roles` | `rbac-read_admin_roles` | Read Admin Roles | OAuth2PasswordBearer |
| 162 | rbac | `POST` | `/api/v1/admin/roles` | `rbac-create_admin_role` | Create Admin Role | OAuth2PasswordBearer |
| 163 | rbac | `GET` | `/api/v1/admin/roles/{role_id}` | `rbac-read_admin_role` | Read Admin Role | OAuth2PasswordBearer |
| 164 | rbac | `PATCH` | `/api/v1/admin/roles/{role_id}` | `rbac-update_admin_role` | Update Admin Role | OAuth2PasswordBearer |
| 165 | rbac | `DELETE` | `/api/v1/admin/roles/{role_id}` | `rbac-delete_admin_role` | Delete Admin Role | OAuth2PasswordBearer |
| 166 | rbac | `PUT` | `/api/v1/admin/roles/{role_id}/permissions` | `rbac-update_admin_role_permissions` | Update Admin Role Permissions | OAuth2PasswordBearer |
| 167 | service-catalog | `GET` | `/api/v1/admin/service-catalog/categories` | `service-catalog-list_categories` | List Categories | OAuth2PasswordBearer |
| 168 | service-catalog | `POST` | `/api/v1/admin/service-catalog/categories` | `service-catalog-create_category` | Create Category | OAuth2PasswordBearer |
| 169 | service-catalog | `PATCH` | `/api/v1/admin/service-catalog/categories/{category_id}` | `service-catalog-update_category` | Update Category | OAuth2PasswordBearer |
| 170 | service-catalog | `DELETE` | `/api/v1/admin/service-catalog/categories/{category_id}` | `service-catalog-delete_category` | Delete Category | OAuth2PasswordBearer |
| 171 | service-catalog | `GET` | `/api/v1/admin/service-catalog/export` | `service-catalog-export_workbook` | Export Workbook | OAuth2PasswordBearer |
| 172 | service-catalog | `POST` | `/api/v1/admin/service-catalog/import` | `service-catalog-import_workbook` | Import Workbook | OAuth2PasswordBearer |
| 173 | service-catalog | `GET` | `/api/v1/admin/service-catalog/nodes/{node_id}/materials` | `service-catalog-list_materials` | List Materials | OAuth2PasswordBearer |
| 174 | service-catalog | `POST` | `/api/v1/admin/service-catalog/nodes/{node_id}/materials` | `service-catalog-create_material` | Create Material | OAuth2PasswordBearer |
| 175 | service-catalog | `PATCH` | `/api/v1/admin/service-catalog/nodes/{node_id}/materials/{material_id}` | `service-catalog-update_material` | Update Material | OAuth2PasswordBearer |
| 176 | service-catalog | `DELETE` | `/api/v1/admin/service-catalog/nodes/{node_id}/materials/{material_id}` | `service-catalog-delete_material` | Delete Material | OAuth2PasswordBearer |
| 177 | service-catalog | `GET` | `/api/v1/admin/service-catalog/services` | `service-catalog-list_services` | List Services | OAuth2PasswordBearer |
| 178 | service-catalog | `POST` | `/api/v1/admin/service-catalog/services` | `service-catalog-create_service` | Create Service | OAuth2PasswordBearer |
| 179 | service-catalog | `GET` | `/api/v1/admin/service-catalog/services/{service_id}` | `service-catalog-get_service` | Get Service | OAuth2PasswordBearer |
| 180 | service-catalog | `PATCH` | `/api/v1/admin/service-catalog/services/{service_id}` | `service-catalog-update_service` | Update Service | OAuth2PasswordBearer |
| 181 | service-catalog | `DELETE` | `/api/v1/admin/service-catalog/services/{service_id}` | `service-catalog-delete_service` | Delete Service | OAuth2PasswordBearer |
| 182 | service-catalog | `GET` | `/api/v1/admin/service-catalog/services/{service_id}/agent-links` | `service-catalog-list_agent_links` | List Agent Links | OAuth2PasswordBearer |
| 183 | service-catalog | `POST` | `/api/v1/admin/service-catalog/services/{service_id}/agent-links` | `service-catalog-create_agent_link` | Create Agent Link | OAuth2PasswordBearer |
| 184 | service-catalog | `PATCH` | `/api/v1/admin/service-catalog/services/{service_id}/agent-links/{link_id}` | `service-catalog-update_agent_link` | Update Agent Link | OAuth2PasswordBearer |
| 185 | service-catalog | `DELETE` | `/api/v1/admin/service-catalog/services/{service_id}/agent-links/{link_id}` | `service-catalog-delete_agent_link` | Delete Agent Link | OAuth2PasswordBearer |
| 186 | service-catalog | `GET` | `/api/v1/admin/service-catalog/services/{service_id}/nodes` | `service-catalog-list_nodes` | List Nodes | OAuth2PasswordBearer |
| 187 | service-catalog | `POST` | `/api/v1/admin/service-catalog/services/{service_id}/nodes` | `service-catalog-create_node` | Create Node | OAuth2PasswordBearer |
| 188 | service-catalog | `PUT` | `/api/v1/admin/service-catalog/services/{service_id}/nodes/reorder` | `service-catalog-reorder_nodes` | Reorder Nodes | OAuth2PasswordBearer |
| 189 | service-catalog | `PATCH` | `/api/v1/admin/service-catalog/services/{service_id}/nodes/{node_id}` | `service-catalog-update_node` | Update Node | OAuth2PasswordBearer |
| 190 | service-catalog | `DELETE` | `/api/v1/admin/service-catalog/services/{service_id}/nodes/{node_id}` | `service-catalog-delete_node` | Delete Node | OAuth2PasswordBearer |
| 191 | service-catalog | `GET` | `/api/v1/admin/service-catalog/services/{service_id}/systems` | `service-catalog-list_systems` | List Systems | OAuth2PasswordBearer |
| 192 | service-catalog | `POST` | `/api/v1/admin/service-catalog/services/{service_id}/systems` | `service-catalog-create_system` | Create System | OAuth2PasswordBearer |
| 193 | service-catalog | `PATCH` | `/api/v1/admin/service-catalog/services/{service_id}/systems/{system_id}` | `service-catalog-update_system` | Update System | OAuth2PasswordBearer |
| 194 | service-catalog | `DELETE` | `/api/v1/admin/service-catalog/services/{service_id}/systems/{system_id}` | `service-catalog-delete_system` | Delete System | OAuth2PasswordBearer |
| 195 | stage-switch | `GET` | `/api/v1/admin/stage-switch/audit-events` | `stage-switch-list_audit_events` | List Audit Events | OAuth2PasswordBearer |
| 196 | stage-switch | `GET` | `/api/v1/admin/stage-switch/notifications` | `stage-switch-list_notifications` | List Notifications | OAuth2PasswordBearer |
| 197 | stage-switch | `POST` | `/api/v1/admin/stage-switch/notifications/read-all` | `stage-switch-mark_all_notifications_read` | Mark All Notifications Read | OAuth2PasswordBearer |
| 198 | stage-switch | `GET` | `/api/v1/admin/stage-switch/notifications/unread-count` | `stage-switch-unread_notification_count` | Unread Notification Count | OAuth2PasswordBearer |
| 199 | stage-switch | `POST` | `/api/v1/admin/stage-switch/notifications/{notification_id}/read` | `stage-switch-mark_notification_read` | Mark Notification Read | OAuth2PasswordBearer |
| 200 | stage-switch | `GET` | `/api/v1/admin/stage-switch/reports/overview` | `stage-switch-get_stage_switch_report_overview` | Get Stage Switch Report Overview | OAuth2PasswordBearer |
| 201 | stage-switch | `GET` | `/api/v1/admin/stage-switch/requests` | `stage-switch-list_requests` | List Requests | OAuth2PasswordBearer |
| 202 | stage-switch | `POST` | `/api/v1/admin/stage-switch/requests` | `stage-switch-create_request` | Create Request | OAuth2PasswordBearer |
| 203 | stage-switch | `GET` | `/api/v1/admin/stage-switch/requests/{request_id}` | `stage-switch-get_request_detail` | Get Request Detail | OAuth2PasswordBearer |
| 204 | stage-switch | `POST` | `/api/v1/admin/stage-switch/requests/{request_id}/cancel` | `stage-switch-cancel_request` | Cancel Request | OAuth2PasswordBearer |
| 205 | stage-switch | `POST` | `/api/v1/admin/stage-switch/requests/{request_id}/decisions` | `stage-switch-submit_decision` | Submit Decision | OAuth2PasswordBearer |
| 206 | stage-switch | `POST` | `/api/v1/admin/stage-switch/requests/{request_id}/retry-execution` | `stage-switch-retry_execution` | Retry Execution | OAuth2PasswordBearer |
| 207 | stage-switch | `GET` | `/api/v1/admin/stage-switch/tasks` | `stage-switch-list_my_tasks` | List My Tasks | OAuth2PasswordBearer |
| 208 | stage-switch | `GET` | `/api/v1/admin/stage-switch/templates` | `stage-switch-list_templates` | List Templates | OAuth2PasswordBearer |
| 209 | stage-switch | `POST` | `/api/v1/admin/stage-switch/templates` | `stage-switch-create_template` | Create Template | OAuth2PasswordBearer |
| 210 | stage-switch | `GET` | `/api/v1/admin/stage-switch/templates/{template_id}` | `stage-switch-get_template` | Get Template | OAuth2PasswordBearer |
| 211 | stage-switch | `PUT` | `/api/v1/admin/stage-switch/templates/{template_id}` | `stage-switch-update_template` | Update Template | OAuth2PasswordBearer |
| 212 | stage-switch | `POST` | `/api/v1/admin/stage-switch/templates/{template_id}/clone` | `stage-switch-clone_template` | Clone Template | OAuth2PasswordBearer |
| 213 | stage-switch | `POST` | `/api/v1/admin/stage-switch/templates/{template_id}/publish` | `stage-switch-publish_template` | Publish Template | OAuth2PasswordBearer |
| 214 | stage-switch | `POST` | `/api/v1/admin/stage-switch/templates/{template_id}/retire` | `stage-switch-retire_template` | Retire Template | OAuth2PasswordBearer |
| 215 | stage-switch | `POST` | `/api/v1/admin/stage-switch/templates/{template_id}/validate` | `stage-switch-validate_template` | Validate Template | OAuth2PasswordBearer |
| 216 | umc-federated-auth | `GET` | `/api/v1/admin/umc-user-mappings` | `umc-federated-auth-list_umc_user_mappings` | List UMC user role mappings | OAuth2PasswordBearer |
| 217 | umc-federated-auth | `POST` | `/api/v1/admin/umc-user-mappings` | `umc-federated-auth-create_umc_user_mapping` | Map a UMC user to Customer or Admin | OAuth2PasswordBearer |
| 218 | umc-federated-auth | `PUT` | `/api/v1/admin/umc-user-mappings/{mapping_id}` | `umc-federated-auth-update_umc_user_mapping` | Update a UMC user role mapping | OAuth2PasswordBearer |
| 219 | umc-federated-auth | `DELETE` | `/api/v1/admin/umc-user-mappings/{mapping_id}` | `umc-federated-auth-delete_umc_user_mapping` | Delete a UMC user role mapping | OAuth2PasswordBearer |
| 220 | rbac | `GET` | `/api/v1/admin/users/assignable-tenants` | `rbac-list_assignable_tenants` | List Assignable Tenants | OAuth2PasswordBearer |
| 221 | rbac | `GET` | `/api/v1/admin/users/{user_id}/organizations` | `rbac-get_user_organizations` | Get User Organizations | OAuth2PasswordBearer |
| 222 | rbac | `PUT` | `/api/v1/admin/users/{user_id}/organizations` | `rbac-update_user_organizations` | Update User Organizations | OAuth2PasswordBearer |
| 223 | rbac | `GET` | `/api/v1/admin/users/{user_id}/roles` | `rbac-read_admin_user_roles` | Read Admin User Roles | OAuth2PasswordBearer |
| 224 | rbac | `PUT` | `/api/v1/admin/users/{user_id}/roles` | `rbac-update_admin_user_roles` | Update Admin User Roles | OAuth2PasswordBearer |
| 225 | ai-chat | `GET` | `/api/v1/ai-chat/config` | `ai-chat-get_ai_chat_config` | Get Ai Chat Config | OAuth2PasswordBearer |
| 226 | ai-chat | `GET` | `/api/v1/ai-chat/conversations` | `ai-chat-list_ai_conversations` | List Ai Conversations | OAuth2PasswordBearer |
| 227 | ai-chat | `DELETE` | `/api/v1/ai-chat/conversations/{conversation_id}` | `ai-chat-delete_ai_conversation` | Delete Ai Conversation | OAuth2PasswordBearer |
| 228 | ai-chat | `GET` | `/api/v1/ai-chat/conversations/{conversation_id}/messages` | `ai-chat-list_ai_conversation_messages` | List Ai Conversation Messages | OAuth2PasswordBearer |
| 229 | ai-chat | `POST` | `/api/v1/ai-chat/messages/stream` | `ai-chat-stream_ai_chat_message` | Stream Ai Chat Message | OAuth2PasswordBearer |
| 230 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/knowledge/datasets` | `ai-generation-service-list_ai_generation_datasets` | List RAGFlow datasets | OAuth2PasswordBearer |
| 231 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/knowledge/datasets` | `ai-generation-service-create_ai_generation_dataset` | Create a RAGFlow dataset | OAuth2PasswordBearer |
| 232 | ai-generation-service | `DELETE` | `/api/v1/ai-generation/api/ai/knowledge/datasets` | `ai-generation-service-delete_ai_generation_datasets` | Delete RAGFlow datasets | OAuth2PasswordBearer |
| 233 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}` | `ai-generation-service-get_ai_generation_dataset` | Get a RAGFlow dataset | OAuth2PasswordBearer |
| 234 | ai-generation-service | `PUT` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}` | `ai-generation-service-update_ai_generation_dataset` | Update a RAGFlow dataset | OAuth2PasswordBearer |
| 235 | ai-generation-service | `DELETE` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}` | `ai-generation-service-delete_ai_generation_dataset` | Delete a RAGFlow dataset | OAuth2PasswordBearer |
| 236 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents` | `ai-generation-service-list_ai_generation_dataset_documents` | List RAGFlow dataset documents | OAuth2PasswordBearer |
| 237 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents` | `ai-generation-service-upload_ai_generation_dataset_documents` | Upload RAGFlow dataset documents | OAuth2PasswordBearer |
| 238 | ai-generation-service | `DELETE` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents` | `ai-generation-service-delete_ai_generation_dataset_documents` | Delete RAGFlow dataset documents | OAuth2PasswordBearer |
| 239 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents/parse` | `ai-generation-service-parse_ai_generation_dataset_documents` | Parse RAGFlow dataset documents | OAuth2PasswordBearer |
| 240 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents/{document_id}` | `ai-generation-service-get_ai_generation_dataset_document` | Get a RAGFlow dataset document | OAuth2PasswordBearer |
| 241 | ai-generation-service | `DELETE` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents/{document_id}` | `ai-generation-service-delete_ai_generation_dataset_document` | Delete a RAGFlow dataset document | OAuth2PasswordBearer |
| 242 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/search` | `ai-generation-service-search_ai_generation_dataset` | Search a RAGFlow dataset | OAuth2PasswordBearer |
| 243 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/knowledge/search` | `ai-generation-service-search_ai_generation_knowledge` | Search AI generation knowledge | OAuth2PasswordBearer |
| 244 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/model/v1/chat/completions` | `ai-generation-service-proxy_ai_generation_chat_completions` | Proxy chat completions | OAuth2PasswordBearer |
| 245 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/model/v1/responses` | `ai-generation-service-proxy_ai_generation_responses` | Proxy model responses | OAuth2PasswordBearer |
| 246 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/quality/check` | `ai-generation-service-check_ai_generation_quality` | Run AI generation quality checks | OAuth2PasswordBearer |
| 247 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/runs` | `ai-generation-service-create_ai_generation_run` | Create an AI generation run | OAuth2PasswordBearer |
| 248 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/runs/{run_id}` | `ai-generation-service-get_ai_generation_run` | Get an AI generation run | OAuth2PasswordBearer |
| 249 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/runs/{run_id}/cancel` | `ai-generation-service-cancel_ai_generation_run` | Cancel an AI generation run | OAuth2PasswordBearer |
| 250 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/runs/{run_id}/events` | `ai-generation-service-list_ai_generation_run_events` | List AI generation run events | OAuth2PasswordBearer |
| 251 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/runs/{run_id}/retry` | `ai-generation-service-retry_ai_generation_run` | Retry an AI generation run | OAuth2PasswordBearer |
| 252 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/skills` | `ai-generation-service-list_ai_generation_skills` | List AI generation skills | OAuth2PasswordBearer |
| 253 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/skills` | `ai-generation-service-create_ai_generation_skill` | Create an AI generation skill | OAuth2PasswordBearer |
| 254 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/skills/export/hermes` | `ai-generation-service-export_ai_generation_skills_to_hermes` | Export AI generation skills to Hermes | OAuth2PasswordBearer |
| 255 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/skills/match` | `ai-generation-service-match_ai_generation_skills` | Match AI generation skills | OAuth2PasswordBearer |
| 256 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/skills/reload` | `ai-generation-service-reload_ai_generation_skills` | Reload AI generation skills | OAuth2PasswordBearer |
| 257 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/skills/{skill_id}` | `ai-generation-service-get_ai_generation_skill` | Get an AI generation skill | OAuth2PasswordBearer |
| 258 | ai-generation-service | `PATCH` | `/api/v1/ai-generation/api/ai/skills/{skill_id}` | `ai-generation-service-update_ai_generation_skill` | Update an AI generation skill | OAuth2PasswordBearer |
| 259 | ai-generation-service | `DELETE` | `/api/v1/ai-generation/api/ai/skills/{skill_id}` | `ai-generation-service-delete_ai_generation_skill` | Delete an AI generation skill | OAuth2PasswordBearer |
| 260 | ai-generation-service | `GET` | `/api/v1/ai-generation/api/ai/tasks/{task_id}/artifacts` | `ai-generation-service-list_ai_generation_task_artifacts` | List AI generation task artifacts | OAuth2PasswordBearer |
| 261 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/tasks/{task_id}/quality` | `ai-generation-service-check_ai_generation_task_quality` | Run quality checks for a task | OAuth2PasswordBearer |
| 262 | ai-generation-service | `POST` | `/api/v1/ai-generation/api/ai/tasks/{task_id}/resume` | `ai-generation-service-resume_ai_generation_task` | Resume AI generation for a task | OAuth2PasswordBearer |
| 263 | ai-generation-service | `GET` | `/api/v1/ai-generation/health` | `ai-generation-service-ai_generation_health` | Check AI Generation Service health | OAuth2PasswordBearer |
| 264 | ai-generation-service | `GET` | `/api/v1/ai-generation/runtime/status` | `ai-generation-service-ai_generation_runtime_status` | Inspect AI Generation Service runtime status | OAuth2PasswordBearer |
| 265 | ai-runtime | `GET` | `/api/v1/ai-runtime/status` | `ai-runtime-ai_runtime_status` | Inspect the active AI runtime | OAuth2PasswordBearer |
| 266 | attachments | `GET` | `/api/v1/attachments` | `attachments-list_attachments` | List Attachments | OAuth2PasswordBearer |
| 267 | attachments | `POST` | `/api/v1/attachments/upload` | `attachments-upload_attachment` | Upload and parse an attachment | OAuth2PasswordBearer |
| 268 | attachments | `GET` | `/api/v1/attachments/{attachment_id}` | `attachments-get_attachment` | Get Attachment | OAuth2PasswordBearer |
| 269 | claw-code | `POST` | `/api/v1/claw/prompt` | `claw-code-claw_prompt` | Claw Prompt | OAuth2PasswordBearer |
| 270 | claw-code | `GET` | `/api/v1/claw/status` | `claw-code-claw_status` | Claw Status | OAuth2PasswordBearer |
| 271 | data-ingestion-proxy | `POST` | `/api/v1/data-gateway` | `data-ingestion-proxy-proxy_data_gateway_root` | Proxy data gateway requests to data_ingestion | 未声明 |
| 272 | data-ingestion-proxy | `POST` | `/api/v1/data-gateway/{path}` | `data-ingestion-proxy-proxy_data_gateway` | Proxy data gateway endpoint code requests to data_ingestion | 未声明 |
| 273 | data-ingestion-proxy | `GET` | `/api/v1/data-ingestion/access-logs` | `data-ingestion-proxy-proxy_data_access_logs_root` | Proxy data access audit log requests to data_ingestion | OAuth2PasswordBearer |
| 274 | data-ingestion-proxy | `POST` | `/api/v1/data-ingestion/access-logs` | `data-ingestion-proxy-proxy_data_access_logs_root` | Proxy data access audit log requests to data_ingestion | OAuth2PasswordBearer |
| 275 | data-ingestion-proxy | `PUT` | `/api/v1/data-ingestion/access-logs` | `data-ingestion-proxy-proxy_data_access_logs_root` | Proxy data access audit log requests to data_ingestion | OAuth2PasswordBearer |
| 276 | data-ingestion-proxy | `PATCH` | `/api/v1/data-ingestion/access-logs` | `data-ingestion-proxy-proxy_data_access_logs_root` | Proxy data access audit log requests to data_ingestion | OAuth2PasswordBearer |
| 277 | data-ingestion-proxy | `DELETE` | `/api/v1/data-ingestion/access-logs` | `data-ingestion-proxy-proxy_data_access_logs_root` | Proxy data access audit log requests to data_ingestion | OAuth2PasswordBearer |
| 278 | data-ingestion-proxy | `OPTIONS` | `/api/v1/data-ingestion/access-logs` | `data-ingestion-proxy-proxy_data_access_logs_root` | Proxy data access audit log requests to data_ingestion | OAuth2PasswordBearer |
| 279 | data-ingestion-proxy | `HEAD` | `/api/v1/data-ingestion/access-logs` | `data-ingestion-proxy-proxy_data_access_logs_root` | Proxy data access audit log requests to data_ingestion | OAuth2PasswordBearer |
| 280 | data-ingestion-proxy | `GET` | `/api/v1/data-ingestion/access-logs/{path}` | `data-ingestion-proxy-proxy_data_access_logs` | Proxy data access audit log sub-paths to data_ingestion | OAuth2PasswordBearer |
| 281 | data-ingestion-proxy | `POST` | `/api/v1/data-ingestion/access-logs/{path}` | `data-ingestion-proxy-proxy_data_access_logs` | Proxy data access audit log sub-paths to data_ingestion | OAuth2PasswordBearer |
| 282 | data-ingestion-proxy | `PUT` | `/api/v1/data-ingestion/access-logs/{path}` | `data-ingestion-proxy-proxy_data_access_logs` | Proxy data access audit log sub-paths to data_ingestion | OAuth2PasswordBearer |
| 283 | data-ingestion-proxy | `PATCH` | `/api/v1/data-ingestion/access-logs/{path}` | `data-ingestion-proxy-proxy_data_access_logs` | Proxy data access audit log sub-paths to data_ingestion | OAuth2PasswordBearer |
| 284 | data-ingestion-proxy | `DELETE` | `/api/v1/data-ingestion/access-logs/{path}` | `data-ingestion-proxy-proxy_data_access_logs` | Proxy data access audit log sub-paths to data_ingestion | OAuth2PasswordBearer |
| 285 | data-ingestion-proxy | `OPTIONS` | `/api/v1/data-ingestion/access-logs/{path}` | `data-ingestion-proxy-proxy_data_access_logs` | Proxy data access audit log sub-paths to data_ingestion | OAuth2PasswordBearer |
| 286 | data-ingestion-proxy | `HEAD` | `/api/v1/data-ingestion/access-logs/{path}` | `data-ingestion-proxy-proxy_data_access_logs` | Proxy data access audit log sub-paths to data_ingestion | OAuth2PasswordBearer |
| 287 | data-ingestion-proxy | `GET` | `/api/v1/data-ingestion/field-policies` | `data-ingestion-proxy-proxy_field_policies_root` | Proxy data ingestion field policy requests to data_ingestion | OAuth2PasswordBearer |
| 288 | data-ingestion-proxy | `POST` | `/api/v1/data-ingestion/field-policies` | `data-ingestion-proxy-proxy_field_policies_root` | Proxy data ingestion field policy requests to data_ingestion | OAuth2PasswordBearer |
| 289 | data-ingestion-proxy | `PUT` | `/api/v1/data-ingestion/field-policies` | `data-ingestion-proxy-proxy_field_policies_root` | Proxy data ingestion field policy requests to data_ingestion | OAuth2PasswordBearer |
| 290 | data-ingestion-proxy | `PATCH` | `/api/v1/data-ingestion/field-policies` | `data-ingestion-proxy-proxy_field_policies_root` | Proxy data ingestion field policy requests to data_ingestion | OAuth2PasswordBearer |
| 291 | data-ingestion-proxy | `DELETE` | `/api/v1/data-ingestion/field-policies` | `data-ingestion-proxy-proxy_field_policies_root` | Proxy data ingestion field policy requests to data_ingestion | OAuth2PasswordBearer |
| 292 | data-ingestion-proxy | `OPTIONS` | `/api/v1/data-ingestion/field-policies` | `data-ingestion-proxy-proxy_field_policies_root` | Proxy data ingestion field policy requests to data_ingestion | OAuth2PasswordBearer |
| 293 | data-ingestion-proxy | `HEAD` | `/api/v1/data-ingestion/field-policies` | `data-ingestion-proxy-proxy_field_policies_root` | Proxy data ingestion field policy requests to data_ingestion | OAuth2PasswordBearer |
| 294 | data-ingestion-proxy | `GET` | `/api/v1/data-ingestion/field-policies/{path}` | `data-ingestion-proxy-proxy_field_policies` | Proxy data ingestion field policy sub-paths to data_ingestion | OAuth2PasswordBearer |
| 295 | data-ingestion-proxy | `POST` | `/api/v1/data-ingestion/field-policies/{path}` | `data-ingestion-proxy-proxy_field_policies` | Proxy data ingestion field policy sub-paths to data_ingestion | OAuth2PasswordBearer |
| 296 | data-ingestion-proxy | `PUT` | `/api/v1/data-ingestion/field-policies/{path}` | `data-ingestion-proxy-proxy_field_policies` | Proxy data ingestion field policy sub-paths to data_ingestion | OAuth2PasswordBearer |
| 297 | data-ingestion-proxy | `PATCH` | `/api/v1/data-ingestion/field-policies/{path}` | `data-ingestion-proxy-proxy_field_policies` | Proxy data ingestion field policy sub-paths to data_ingestion | OAuth2PasswordBearer |
| 298 | data-ingestion-proxy | `DELETE` | `/api/v1/data-ingestion/field-policies/{path}` | `data-ingestion-proxy-proxy_field_policies` | Proxy data ingestion field policy sub-paths to data_ingestion | OAuth2PasswordBearer |
| 299 | data-ingestion-proxy | `OPTIONS` | `/api/v1/data-ingestion/field-policies/{path}` | `data-ingestion-proxy-proxy_field_policies` | Proxy data ingestion field policy sub-paths to data_ingestion | OAuth2PasswordBearer |
| 300 | data-ingestion-proxy | `HEAD` | `/api/v1/data-ingestion/field-policies/{path}` | `data-ingestion-proxy-proxy_field_policies` | Proxy data ingestion field policy sub-paths to data_ingestion | OAuth2PasswordBearer |
| 301 | data-ingestion-proxy | `POST` | `/api/v1/data-ingestion/gateway-token` | `data-ingestion-proxy-issue_data_gateway_token` | Issue a data gateway token for the current user | OAuth2PasswordBearer |
| 302 | data-ingestion-proxy | `POST` | `/api/v1/data-ingestion/gateway-token/users/{user_id}` | `data-ingestion-proxy-issue_data_gateway_token_for_user` | Issue a data gateway token for a specified user | OAuth2PasswordBearer |
| 303 | data-ingestion-proxy | `GET` | `/api/v1/data-ingestion/integrations` | `data-ingestion-proxy-proxy_data_ingestion_integrations` | Proxy data ingestion integration status requests | OAuth2PasswordBearer |
| 304 | data-ingestion-proxy | `GET` | `/api/v1/data-sources` | `data-ingestion-proxy-proxy_data_sources_root` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 305 | data-ingestion-proxy | `POST` | `/api/v1/data-sources` | `data-ingestion-proxy-proxy_data_sources_root` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 306 | data-ingestion-proxy | `PUT` | `/api/v1/data-sources` | `data-ingestion-proxy-proxy_data_sources_root` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 307 | data-ingestion-proxy | `PATCH` | `/api/v1/data-sources` | `data-ingestion-proxy-proxy_data_sources_root` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 308 | data-ingestion-proxy | `DELETE` | `/api/v1/data-sources` | `data-ingestion-proxy-proxy_data_sources_root` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 309 | data-ingestion-proxy | `OPTIONS` | `/api/v1/data-sources` | `data-ingestion-proxy-proxy_data_sources_root` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 310 | data-ingestion-proxy | `HEAD` | `/api/v1/data-sources` | `data-ingestion-proxy-proxy_data_sources_root` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 311 | data-ingestion-proxy | `GET` | `/api/v1/data-sources/{path}` | `data-ingestion-proxy-proxy_data_sources` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 312 | data-ingestion-proxy | `POST` | `/api/v1/data-sources/{path}` | `data-ingestion-proxy-proxy_data_sources` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 313 | data-ingestion-proxy | `PUT` | `/api/v1/data-sources/{path}` | `data-ingestion-proxy-proxy_data_sources` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 314 | data-ingestion-proxy | `PATCH` | `/api/v1/data-sources/{path}` | `data-ingestion-proxy-proxy_data_sources` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 315 | data-ingestion-proxy | `DELETE` | `/api/v1/data-sources/{path}` | `data-ingestion-proxy-proxy_data_sources` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 316 | data-ingestion-proxy | `OPTIONS` | `/api/v1/data-sources/{path}` | `data-ingestion-proxy-proxy_data_sources` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 317 | data-ingestion-proxy | `HEAD` | `/api/v1/data-sources/{path}` | `data-ingestion-proxy-proxy_data_sources` | Proxy data source management requests to data_ingestion | OAuth2PasswordBearer |
| 318 | exam-api | `GET` | `/api/v1/exam/admin/attempts` | `exam-api-list_all_admin_attempts` | List all exam attempts as an administrator | OAuth2PasswordBearer |
| 319 | exam-api | `GET` | `/api/v1/exam/admin/attempts/{attempt_id}` | `exam-api-get_admin_attempt` | Get an exam attempt as an administrator | OAuth2PasswordBearer |
| 320 | exam-api | `GET` | `/api/v1/exam/admin/exams` | `exam-api-list_admin_exams` | List exam papers as an administrator | OAuth2PasswordBearer |
| 321 | exam-api | `POST` | `/api/v1/exam/admin/exams` | `exam-api-create_admin_exam` | Create an exam paper as an administrator | OAuth2PasswordBearer |
| 322 | exam-api | `GET` | `/api/v1/exam/admin/exams/{paper_id}` | `exam-api-get_admin_exam` | Get an exam paper as an administrator | OAuth2PasswordBearer |
| 323 | exam-api | `PATCH` | `/api/v1/exam/admin/exams/{paper_id}` | `exam-api-update_admin_exam` | Update an exam paper as an administrator | OAuth2PasswordBearer |
| 324 | exam-api | `DELETE` | `/api/v1/exam/admin/exams/{paper_id}` | `exam-api-delete_admin_exam` | Delete an exam paper as an administrator | OAuth2PasswordBearer |
| 325 | exam-api | `GET` | `/api/v1/exam/admin/exams/{paper_id}/attempts` | `exam-api-list_admin_exam_attempts` | List attempts for an exam paper as an administrator | OAuth2PasswordBearer |
| 326 | exam-api | `POST` | `/api/v1/exam/admin/exams/{paper_id}/publish` | `exam-api-publish_admin_exam` | Publish an exam paper as an administrator | OAuth2PasswordBearer |
| 327 | exam-api | `GET` | `/api/v1/exam/admin/exams/{paper_id}/question-accuracy` | `exam-api-get_admin_exam_question_accuracy` | Get question accuracy for an exam paper as an administrator | OAuth2PasswordBearer |
| 328 | exam-api | `GET` | `/api/v1/exam/admin/exams/{paper_id}/questions` | `exam-api-list_admin_exam_questions` | List questions for an exam paper as an administrator | OAuth2PasswordBearer |
| 329 | exam-api | `POST` | `/api/v1/exam/admin/exams/{paper_id}/questions` | `exam-api-create_admin_exam_question` | Create a question for an exam paper as an administrator | OAuth2PasswordBearer |
| 330 | exam-api | `POST` | `/api/v1/exam/admin/exams/{paper_id}/questions/import` | `exam-api-import_admin_exam_questions` | Import questions into an exam paper as an administrator | OAuth2PasswordBearer |
| 331 | exam-api | `POST` | `/api/v1/exam/admin/exams/{paper_id}/questions/link` | `exam-api-link_admin_exam_questions` | Link question bank items to an exam paper as an administrator | OAuth2PasswordBearer |
| 332 | exam-api | `DELETE` | `/api/v1/exam/admin/exams/{paper_id}/questions/{question_id}` | `exam-api-unlink_admin_exam_question` | Unlink a question from an exam paper as an administrator | OAuth2PasswordBearer |
| 333 | exam-api | `POST` | `/api/v1/exam/admin/exams/{paper_id}/unpublish` | `exam-api-unpublish_admin_exam` | Unpublish an exam paper as an administrator | OAuth2PasswordBearer |
| 334 | exam-api | `GET` | `/api/v1/exam/admin/questions` | `exam-api-list_admin_questions` | List question bank items as an administrator | OAuth2PasswordBearer |
| 335 | exam-api | `POST` | `/api/v1/exam/admin/questions` | `exam-api-create_admin_question` | Create a question bank item as an administrator | OAuth2PasswordBearer |
| 336 | exam-api | `POST` | `/api/v1/exam/admin/questions/import` | `exam-api-import_admin_questions` | Import question bank items as an administrator | OAuth2PasswordBearer |
| 337 | exam-api | `PATCH` | `/api/v1/exam/admin/questions/{question_id}` | `exam-api-update_admin_question` | Update a question bank item as an administrator | OAuth2PasswordBearer |
| 338 | exam-api | `DELETE` | `/api/v1/exam/admin/questions/{question_id}` | `exam-api-delete_admin_question` | Delete a question bank item as an administrator | OAuth2PasswordBearer |
| 339 | exam-api | `POST` | `/api/v1/exam/agent/exams` | `exam-api-create_agent_exam` | Create and publish an exam paper through the Exam API | OAuth2PasswordBearer |
| 340 | exam-api | `GET` | `/api/v1/exam/attempts` | `exam-api-list_attempts` | List exam attempts for the current user | OAuth2PasswordBearer |
| 341 | exam-api | `GET` | `/api/v1/exam/attempts/{attempt_id}` | `exam-api-get_attempt` | Get the current user's exam attempt | OAuth2PasswordBearer |
| 342 | exam-api | `PATCH` | `/api/v1/exam/attempts/{attempt_id}/answers` | `exam-api-save_attempt_answers` | Save draft answers for the current user's exam attempt | OAuth2PasswordBearer |
| 343 | exam-api | `GET` | `/api/v1/exam/attempts/{attempt_id}/result` | `exam-api-get_attempt_result` | Get the current user's exam attempt result | OAuth2PasswordBearer |
| 344 | exam-api | `POST` | `/api/v1/exam/attempts/{attempt_id}/submit` | `exam-api-submit_attempt` | Submit answers for the current user's exam attempt | OAuth2PasswordBearer |
| 345 | exam-api | `GET` | `/api/v1/exam/exams` | `exam-api-list_exams` | List exam papers visible to the current user | OAuth2PasswordBearer |
| 346 | exam-api | `GET` | `/api/v1/exam/exams/{paper_id}` | `exam-api-get_exam` | Get an exam paper visible to the current user | OAuth2PasswordBearer |
| 347 | exam-api | `POST` | `/api/v1/exam/exams/{paper_id}/attempts` | `exam-api-create_exam_attempt` | Start an exam attempt for the current user | OAuth2PasswordBearer |
| 348 | exam-api | `GET` | `/api/v1/exam/health` | `exam-api-exam_health` | Check the Exam API readiness through the platform backend | OAuth2PasswordBearer |
| 349 | exam-api | `GET` | `/api/v1/exam/openapi.json` | `exam-api-exam_openapi` | Fetch the Exam API OpenAPI document through the platform backend | OAuth2PasswordBearer |
| 350 | workflow-proxy | `GET` | `/api/v1/flowise/{path}` | `workflow-proxy-proxy_flowise` | 代理 Flowise 工作流设计接口 | OAuth2PasswordBearer |
| 351 | workflow-proxy | `POST` | `/api/v1/flowise/{path}` | `workflow-proxy-proxy_flowise` | 代理 Flowise 工作流设计接口 | OAuth2PasswordBearer |
| 352 | workflow-proxy | `PUT` | `/api/v1/flowise/{path}` | `workflow-proxy-proxy_flowise` | 代理 Flowise 工作流设计接口 | OAuth2PasswordBearer |
| 353 | workflow-proxy | `PATCH` | `/api/v1/flowise/{path}` | `workflow-proxy-proxy_flowise` | 代理 Flowise 工作流设计接口 | OAuth2PasswordBearer |
| 354 | workflow-proxy | `DELETE` | `/api/v1/flowise/{path}` | `workflow-proxy-proxy_flowise` | 代理 Flowise 工作流设计接口 | OAuth2PasswordBearer |
| 355 | hermes-tools | `POST` | `/api/v1/hermes/tools/{tool_name}` | `hermes-tools-execute_hermes_tool` | Execute a controlled Hermes backend tool | OAuth2PasswordBearer |
| 356 | tools | `POST` | `/api/v1/internal/tool-registry/registrations` | `tools-register_tool_projection` | Consume one immutable API Tool registration event | 未声明 |
| 357 | tools | `POST` | `/api/v1/internal/tool-registry/resolve` | `tools-resolve_tool_projection` | Resolve one frozen Tool reference for an explicit purpose | 未声明 |
| 358 | tools | `GET` | `/api/v1/internal/tool-registry/tools` | `tools-list_tool_projections` | List unified Tool Registry projections without hidden executor fields | 未声明 |
| 359 | tools | `GET` | `/api/v1/internal/tool-registry/tools/{tool_id}/versions/{source_version}` | `tools-get_tool_projection` | Read one exact unified Tool Registry projection | 未声明 |
| 360 | tools | `POST` | `/api/v1/internal/tool-registry/tools/{tool_id}/versions/{source_version}/deprecations` | `tools-deprecate_tool_projection` | Deprecate one exact Tool version | 未声明 |
| 361 | tools | `POST` | `/api/v1/internal/tool-registry/tools/{tool_id}/versions/{source_version}/revocations` | `tools-revoke_tool_projection` | Revoke one exact Tool version | 未声明 |
| 362 | tools | `POST` | `/api/v1/internal/tools/{tool_ref}/invoke` | `tools-invoke_tool_internal` | Invoke one immutable read-only tool as a trusted internal service | 未声明 |
| 363 | items | `GET` | `/api/v1/items/` | `items-read_items` | Read Items | OAuth2PasswordBearer |
| 364 | items | `POST` | `/api/v1/items/` | `items-create_item` | Create Item | OAuth2PasswordBearer |
| 365 | items | `GET` | `/api/v1/items/{id}` | `items-read_item` | Read Item | OAuth2PasswordBearer |
| 366 | items | `PUT` | `/api/v1/items/{id}` | `items-update_item` | Update Item | OAuth2PasswordBearer |
| 367 | items | `DELETE` | `/api/v1/items/{id}` | `items-delete_item` | Delete Item | OAuth2PasswordBearer |
| 368 | login | `POST` | `/api/v1/login/access-token` | `login-login_access_token` | Log in with platform credentials or an optional UMC Bearer token | 未声明 |
| 369 | login | `POST` | `/api/v1/login/chatbot-session` | `login-login_chatbot_session` | Login Chatbot Session | OAuth2PasswordBearer |
| 370 | login | `POST` | `/api/v1/login/test-token` | `login-test_token` | Validate a platform access token | OAuth2PasswordBearer |
| 371 | login | `POST` | `/api/v1/login/umc/access-token` | `login-umc_access_token` | Exchange a UMC user token for an isolated platform session | 未声明 |
| 372 | mailgraph-knowledge-base | `GET` | `/api/v1/mailgraph/{path}` | `mailgraph-knowledge-base-proxy_mailgraph` | 访问邮件分析知识库 | OAuth2PasswordBearer |
| 373 | mailgraph-knowledge-base | `POST` | `/api/v1/mailgraph/{path}` | `mailgraph-knowledge-base-proxy_mailgraph` | 访问邮件分析知识库 | OAuth2PasswordBearer |
| 374 | mailgraph-knowledge-base | `PUT` | `/api/v1/mailgraph/{path}` | `mailgraph-knowledge-base-proxy_mailgraph` | 访问邮件分析知识库 | OAuth2PasswordBearer |
| 375 | mailgraph-knowledge-base | `PATCH` | `/api/v1/mailgraph/{path}` | `mailgraph-knowledge-base-proxy_mailgraph` | 访问邮件分析知识库 | OAuth2PasswordBearer |
| 376 | mailgraph-knowledge-base | `DELETE` | `/api/v1/mailgraph/{path}` | `mailgraph-knowledge-base-proxy_mailgraph` | 访问邮件分析知识库 | OAuth2PasswordBearer |
| 377 | rbac | `GET` | `/api/v1/menus/me` | `rbac-read_current_menus` | Read Current Menus | OAuth2PasswordBearer |
| 378 | mock-security-scan | `GET` | `/api/v1/mock/security-scan/findings` | `mock-security-scan-get_security_scan_findings` | Get all mock security scan findings | 未声明 |
| 379 | login | `POST` | `/api/v1/password-recovery-html-content/{email}` | `login-recover_password_html_content` | Recover Password Html Content | OAuth2PasswordBearer |
| 380 | login | `POST` | `/api/v1/password-recovery/{email}` | `login-recover_password` | Recover Password | 未声明 |
| 381 | workflow-proxy | `GET` | `/api/v1/platform-apps` | `workflow-proxy-proxy_platform_apps` | Proxy Platform Apps | OAuth2PasswordBearer |
| 382 | workflow-proxy | `GET` | `/api/v1/platform-apps/{path}` | `workflow-proxy-proxy_platform_apps` | Proxy Platform Apps | OAuth2PasswordBearer |
| 383 | workflow-proxy | `POST` | `/api/v1/platform-apps/{path}` | `workflow-proxy-proxy_platform_apps` | Proxy Platform Apps | OAuth2PasswordBearer |
| 384 | workflow-proxy | `PUT` | `/api/v1/platform-apps/{path}` | `workflow-proxy-proxy_platform_apps` | Proxy Platform Apps | OAuth2PasswordBearer |
| 385 | workflow-proxy | `PATCH` | `/api/v1/platform-apps/{path}` | `workflow-proxy-proxy_platform_apps` | Proxy Platform Apps | OAuth2PasswordBearer |
| 386 | workflow-proxy | `DELETE` | `/api/v1/platform-apps/{path}` | `workflow-proxy-proxy_platform_apps` | Proxy Platform Apps | OAuth2PasswordBearer |
| 387 | plugins | `GET` | `/api/v1/plugins` | `plugins-list_plugin_definitions` | List registered plugin definitions | OAuth2PasswordBearer |
| 388 | plugins | `POST` | `/api/v1/plugins` | `plugins-create_plugin_registration` | Register a plugin definition and its first version | OAuth2PasswordBearer |
| 389 | plugin-access-gateway | `GET` | `/api/v1/plugins/auth` | `plugin-access-gateway-authorize_plugin_request_get` | Authorize an Nginx auth_request for a plugin route | OAuth2PasswordBearer |
| 390 | plugin-access-gateway | `POST` | `/api/v1/plugins/auth` | `plugin-access-gateway-authorize_plugin_request_post` | Authorize a structured plugin gateway request | OAuth2PasswordBearer |
| 391 | plugin-control-plane | `POST` | `/api/v1/plugins/builtin/exam/install` | `plugin-control-plane-install_builtin_exam_plugin` | Register the existing Exam API as an official built-in plugin installation | OAuth2PasswordBearer |
| 392 | plugin-workflow-publications | `GET` | `/api/v1/plugins/catalog` | `plugin-workflow-publications-list_plugin_catalog` | List enabled platform applications from plugin installations | OAuth2PasswordBearer |
| 393 | plugin-workflow-publications | `POST` | `/api/v1/plugins/catalog/{installation_id}/favorite` | `plugin-workflow-publications-add_plugin_favorite` | Add one enabled plugin application to the current user's shortcuts | OAuth2PasswordBearer |
| 394 | plugin-workflow-publications | `DELETE` | `/api/v1/plugins/catalog/{installation_id}/favorite` | `plugin-workflow-publications-remove_plugin_favorite` | Remove one plugin application from the current user's shortcuts | OAuth2PasswordBearer |
| 395 | plugins | `POST` | `/api/v1/plugins/import-compose` | `plugins-import_plugin_from_compose` | Upload Docker Compose and register a plugin from actual runtime | OAuth2PasswordBearer |
| 396 | plugin-access-gateway | `GET` | `/api/v1/plugins/installed/menus` | `plugin-access-gateway-list_installed_plugin_menus` | List healthy plugin menu declarations visible to the current user | OAuth2PasswordBearer |
| 397 | plugin-internal-callbacks | `POST` | `/api/v1/plugins/internal/events` | `plugin-internal-callbacks-receive_plugin_event` | Accept an authenticated event from one plugin instance | HTTPBearer |
| 398 | plugin-workflow-publications | `GET` | `/api/v1/plugins/internal/workflow-publications` | `plugin-workflow-publications-list_workflow_plugin_publications` | List Workflow-to-plugin publication jobs and mappings | OAuth2PasswordBearer |
| 399 | plugin-workflow-publications | `POST` | `/api/v1/plugins/internal/workflow-publications` | `plugin-workflow-publications-publish_workflow_plugin` | Publish an immutable Workflow version as a native platform plugin | OAuth2PasswordBearer |
| 400 | plugin-workflow-publications | `GET` | `/api/v1/plugins/internal/workflow-publications/{workflow_version_id}` | `plugin-workflow-publications-read_workflow_plugin_publication` | Read one Workflow plugin publication mapping and status | OAuth2PasswordBearer |
| 401 | plugin-workflow-publications | `POST` | `/api/v1/plugins/internal/workflow-publications/{workflow_version_id}/archive` | `plugin-workflow-publications-archive_workflow_plugin_publication` | Archive a Workflow plugin and remove it from the application catalog | OAuth2PasswordBearer |
| 402 | plugin-workflow-publications | `POST` | `/api/v1/plugins/internal/workflow-publications/{workflow_version_id}/disable` | `plugin-workflow-publications-disable_workflow_plugin_publication` | Disable a Workflow plugin installation, services, menu, and routes | OAuth2PasswordBearer |
| 403 | plugin-workflow-publications | `POST` | `/api/v1/plugins/internal/workflow-publications/{workflow_version_id}/enable` | `plugin-workflow-publications-enable_workflow_plugin_publication` | Re-enable a disabled Workflow plugin publication | OAuth2PasswordBearer |
| 404 | plugin-workflow-publications | `POST` | `/api/v1/plugins/internal/workflow-publications/{workflow_version_id}/retry` | `plugin-workflow-publications-retry_workflow_plugin_publication` | Retry a failed Workflow plugin publication with its original idempotency key | OAuth2PasswordBearer |
| 405 | plugin-workflow-publications | `POST` | `/api/v1/plugins/internal/workflow-publications/{workflow_version_id}/rollback` | `plugin-workflow-publications-rollback_workflow_plugin_publication` | Roll a Workflow plugin installation back to a previously published version | OAuth2PasswordBearer |
| 406 | plugin-workflow-publications | `PUT` | `/api/v1/plugins/internal/workflow-publications/{workflow_version_id}/runtime-binding` | `plugin-workflow-publications-bind_workflow_runtime` | Bind one prepared Workflow runtime release to a disabled publication | 未声明 |
| 407 | plugins | `POST` | `/api/v1/plugins/manifest-drafts/from-compose` | `plugins-create_manifest_draft_from_compose` | Generate a plugin Manifest draft from Docker Compose | OAuth2PasswordBearer |
| 408 | plugins | `POST` | `/api/v1/plugins/manifest-drafts/validate` | `plugins-validate_manifest_draft` | Validate a plugin Manifest draft | OAuth2PasswordBearer |
| 409 | plugin-control-plane | `GET` | `/api/v1/plugins/metrics` | `plugin-control-plane-read_plugin_metrics` | Read aggregate plugin control-plane operational metrics | OAuth2PasswordBearer |
| 410 | plugin-control-plane | `GET` | `/api/v1/plugins/operations` | `plugin-control-plane-list_plugin_operations` | List durable plugin operations | OAuth2PasswordBearer |
| 411 | plugin-control-plane | `GET` | `/api/v1/plugins/operations/{operation_id}` | `plugin-control-plane-read_plugin_operation` | Read a durable plugin operation and all recorded steps | OAuth2PasswordBearer |
| 412 | plugin-control-plane | `POST` | `/api/v1/plugins/operations/{operation_id}/retry` | `plugin-control-plane-retry_plugin_operation` | Retry a failed or rolled-back plugin operation | OAuth2PasswordBearer |
| 413 | plugin-control-plane | `POST` | `/api/v1/plugins/routes/reload-nginx` | `plugin-control-plane-reload_plugin_nginx_routes` | Render and publish the complete plugin Nginx configuration | OAuth2PasswordBearer |
| 414 | plugin-runtime | `GET` | `/api/v1/plugins/runtime/health` | `plugin-runtime-runtime_health` | 检查插件运行器健康状态 | OAuth2PasswordBearer |
| 415 | plugin-runtime | `GET` | `/api/v1/plugins/runtime/info` | `plugin-runtime-runtime_info` | 查询插件运行器连接信息 | OAuth2PasswordBearer |
| 416 | plugin-workflow-publications | `GET` | `/api/v1/plugins/workflow-runtime/apps/{workflow_app_id}` | `plugin-workflow-publications-read_workflow_runtime_config` | Load a published native Workflow application's conversation configuration | OAuth2PasswordBearer |
| 417 | plugin-workflow-publications | `GET` | `/api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/conversations` | `plugin-workflow-publications-list_workflow_runtime_conversations` | List persisted conversations from the active Workflow Runtime | OAuth2PasswordBearer |
| 418 | plugin-workflow-publications | `DELETE` | `/api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/conversations/{conversation_id}` | `plugin-workflow-publications-delete_workflow_runtime_conversation` | Delete one persisted Workflow Runtime conversation | OAuth2PasswordBearer |
| 419 | plugin-workflow-publications | `GET` | `/api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/conversations/{conversation_id}/messages` | `plugin-workflow-publications-list_workflow_runtime_conversation_messages` | Read messages from one persisted Workflow Runtime conversation | OAuth2PasswordBearer |
| 420 | plugin-workflow-publications | `POST` | `/api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/messages` | `plugin-workflow-publications-send_workflow_runtime_message` | Run one message through the native Workflow runtime adapter | OAuth2PasswordBearer |
| 421 | plugin-workflow-publications | `POST` | `/api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/messages/stream` | `plugin-workflow-publications-stream_workflow_runtime_message` | Stream one message through the active Workflow Runtime workbench | OAuth2PasswordBearer |
| 422 | plugin-workflow-publications | `GET` | `/api/v1/plugins/workflow-runtime/health` | `plugin-workflow-publications-workflow_runtime_health` | Check the native Workflow plugin adapter | 未声明 |
| 423 | plugins | `GET` | `/api/v1/plugins/{plugin_id}` | `plugins-read_plugin_definition` | Read one plugin definition and all registered versions | OAuth2PasswordBearer |
| 424 | plugins | `PATCH` | `/api/v1/plugins/{plugin_id}` | `plugins-update_plugin_definition` | Update plugin display metadata | OAuth2PasswordBearer |
| 425 | plugins | `DELETE` | `/api/v1/plugins/{plugin_id}` | `plugins-delete_plugin_definition` | Delete an unused plugin definition | OAuth2PasswordBearer |
| 426 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/audit-logs` | `plugin-control-plane-list_plugin_audits` | List immutable plugin control-plane audit events | OAuth2PasswordBearer |
| 427 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/billing-events` | `plugin-control-plane-create_plugin_billing_event` | Record an idempotent metered plugin billing event | OAuth2PasswordBearer |
| 428 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/config` | `plugin-control-plane-read_plugin_config` | Read non-secret plugin configuration and configured secret keys | OAuth2PasswordBearer |
| 429 | plugin-control-plane | `PUT` | `/api/v1/plugins/{plugin_id}/config` | `plugin-control-plane-update_plugin_config` | Update tenant configuration and rotate write-only secrets | OAuth2PasswordBearer |
| 430 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/disable` | `plugin-control-plane-disable_plugin` | Disable one plugin installation while retaining data | OAuth2PasswordBearer |
| 431 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/dokku/logs` | `plugin-control-plane-read_dokku_logs` | Read bounded Dokku logs from one plugin app resource | OAuth2PasswordBearer |
| 432 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/dokku/redeploy-resource/{resource_name}` | `plugin-control-plane-redeploy_plugin_resource` | Redeploy one bound Dokku app from its locked image | OAuth2PasswordBearer |
| 433 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/dokku/restart-resource/{resource_name}` | `plugin-control-plane-restart_plugin_resource` | Restart one bound Dokku app resource | OAuth2PasswordBearer |
| 434 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/dokku/status` | `plugin-control-plane-read_dokku_status` | Read live Dokku status for every bound runtime resource | OAuth2PasswordBearer |
| 435 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/enable` | `plugin-control-plane-enable_plugin` | Enable or restore one plugin installation | OAuth2PasswordBearer |
| 436 | plugin-access-gateway | `GET` | `/api/v1/plugins/{plugin_id}/health` | `plugin-access-gateway-read_plugin_health` | Read and refresh the health of an installed plugin | 未声明 |
| 437 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/install` | `plugin-control-plane-install_plugin` | Install a registered plugin for one organization | OAuth2PasswordBearer |
| 438 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/install-preflight` | `plugin-control-plane-preflight_plugin_install` | Preflight a tenant plugin installation without changing state | OAuth2PasswordBearer |
| 439 | plugins | `GET` | `/api/v1/plugins/{plugin_id}/installations` | `plugins-list_plugin_installations` | List tenant installation records for one plugin | OAuth2PasswordBearer |
| 440 | plugins | `POST` | `/api/v1/plugins/{plugin_id}/installations` | `plugins-create_plugin_installation` | Record a tenant plugin installation | OAuth2PasswordBearer |
| 441 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/installations/{installation_id}` | `plugin-control-plane-read_plugin_installation` | Read one tenant plugin installation | OAuth2PasswordBearer |
| 442 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/logs` | `plugin-control-plane-read_plugin_logs` | Read bounded logs from one plugin app resource | OAuth2PasswordBearer |
| 443 | plugin-access-gateway | `GET` | `/api/v1/plugins/{plugin_id}/openapi` | `plugin-access-gateway-read_plugin_openapi` | Read the last validated OpenAPI document for an installed plugin | OAuth2PasswordBearer |
| 444 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/permissions` | `plugin-control-plane-list_plugin_permissions` | List permission scopes declared by a plugin manifest | OAuth2PasswordBearer |
| 445 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/permissions/roles/{role_id}` | `plugin-control-plane-read_role_plugin_permissions` | Read plugin scopes granted to one role | OAuth2PasswordBearer |
| 446 | plugin-control-plane | `PUT` | `/api/v1/plugins/{plugin_id}/permissions/roles/{role_id}` | `plugin-control-plane-update_role_plugin_permissions` | Replace plugin scopes granted to one role | OAuth2PasswordBearer |
| 447 | plugin-access-gateway | `GET` | `/api/v1/plugins/{plugin_id}/proxy` | `proxy_plugin_api_root_get` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 448 | plugin-access-gateway | `POST` | `/api/v1/plugins/{plugin_id}/proxy` | `proxy_plugin_api_root_post` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 449 | plugin-access-gateway | `PUT` | `/api/v1/plugins/{plugin_id}/proxy` | `proxy_plugin_api_root_put` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 450 | plugin-access-gateway | `PATCH` | `/api/v1/plugins/{plugin_id}/proxy` | `proxy_plugin_api_root_patch` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 451 | plugin-access-gateway | `DELETE` | `/api/v1/plugins/{plugin_id}/proxy` | `proxy_plugin_api_root_delete` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 452 | plugin-access-gateway | `OPTIONS` | `/api/v1/plugins/{plugin_id}/proxy` | `proxy_plugin_api_root_options` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 453 | plugin-access-gateway | `HEAD` | `/api/v1/plugins/{plugin_id}/proxy` | `proxy_plugin_api_root_head` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 454 | plugin-access-gateway | `GET` | `/api/v1/plugins/{plugin_id}/proxy/{proxy_path}` | `proxy_plugin_api_path_get` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 455 | plugin-access-gateway | `POST` | `/api/v1/plugins/{plugin_id}/proxy/{proxy_path}` | `proxy_plugin_api_path_post` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 456 | plugin-access-gateway | `PUT` | `/api/v1/plugins/{plugin_id}/proxy/{proxy_path}` | `proxy_plugin_api_path_put` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 457 | plugin-access-gateway | `PATCH` | `/api/v1/plugins/{plugin_id}/proxy/{proxy_path}` | `proxy_plugin_api_path_patch` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 458 | plugin-access-gateway | `DELETE` | `/api/v1/plugins/{plugin_id}/proxy/{proxy_path}` | `proxy_plugin_api_path_delete` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 459 | plugin-access-gateway | `OPTIONS` | `/api/v1/plugins/{plugin_id}/proxy/{proxy_path}` | `proxy_plugin_api_path_options` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 460 | plugin-access-gateway | `HEAD` | `/api/v1/plugins/{plugin_id}/proxy/{proxy_path}` | `proxy_plugin_api_path_head` | Proxy a plugin API request through tenant and scope authorization | 未声明 |
| 461 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/restart` | `plugin-control-plane-restart_plugin` | Restart all app resources for one plugin installation | OAuth2PasswordBearer |
| 462 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/rollback` | `plugin-control-plane-rollback_plugin` | Roll back one plugin installation to its previous version | OAuth2PasswordBearer |
| 463 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/routes` | `plugin-control-plane-list_plugin_routes` | List generated gateway routes for one plugin installation | OAuth2PasswordBearer |
| 464 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/runtime-resources` | `plugin-control-plane-list_runtime_resources` | List Dokku apps and services bound to one plugin installation | OAuth2PasswordBearer |
| 465 | plugin-control-plane | `GET` | `/api/v1/plugins/{plugin_id}/services` | `plugin-control-plane-list_plugin_services` | List registered services for one plugin installation | OAuth2PasswordBearer |
| 466 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/services/health-check` | `plugin-control-plane-health_check_plugin_services` | Run HTTP health and OpenAPI checks for registered services | OAuth2PasswordBearer |
| 467 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/services/register` | `plugin-control-plane-register_plugin_service` | Register or replace one resolved plugin service | OAuth2PasswordBearer |
| 468 | plugin-access-gateway | `GET` | `/api/v1/plugins/{plugin_id}/ui` | `proxy_plugin_ui_root_get` | Proxy plugin Web UI static content | 未声明 |
| 469 | plugin-access-gateway | `HEAD` | `/api/v1/plugins/{plugin_id}/ui` | `proxy_plugin_ui_root_head` | Proxy plugin Web UI static content | 未声明 |
| 470 | plugin-access-gateway | `POST` | `/api/v1/plugins/{plugin_id}/ui-session` | `plugin-access-gateway-create_plugin_ui_session` | Create a short-lived browser session for a plugin Web UI | OAuth2PasswordBearer |
| 471 | plugin-access-gateway | `GET` | `/api/v1/plugins/{plugin_id}/ui/{proxy_path}` | `proxy_plugin_ui_path_get` | Proxy plugin Web UI static content | 未声明 |
| 472 | plugin-access-gateway | `HEAD` | `/api/v1/plugins/{plugin_id}/ui/{proxy_path}` | `proxy_plugin_ui_path_head` | Proxy plugin Web UI static content | 未声明 |
| 473 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/uninstall-hard` | `plugin-control-plane-hard_uninstall_plugin` | Permanently destroy a plugin after confirmation and backup acknowledgement | OAuth2PasswordBearer |
| 474 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/uninstall-soft` | `plugin-control-plane-soft_uninstall_plugin` | Soft-uninstall a plugin and retain data and configuration | OAuth2PasswordBearer |
| 475 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/upgrade` | `plugin-control-plane-upgrade_plugin` | Upgrade one plugin installation with automatic rollback | OAuth2PasswordBearer |
| 476 | plugin-control-plane | `POST` | `/api/v1/plugins/{plugin_id}/verify` | `plugin-control-plane-verify_plugin` | Verify stored manifests and immutable delivery references | OAuth2PasswordBearer |
| 477 | plugins | `GET` | `/api/v1/plugins/{plugin_id}/versions` | `plugins-list_plugin_versions` | List registered versions for one plugin | OAuth2PasswordBearer |
| 478 | plugins | `POST` | `/api/v1/plugins/{plugin_id}/versions` | `plugins-create_plugin_version` | Register another immutable plugin version | OAuth2PasswordBearer |
| 479 | data-ingestion-proxy | `POST` | `/api/v1/public/data-access/{endpoint_code}` | `data-ingestion-proxy-proxy_public_umc_endpoint` | Call a published UMC data endpoint with a UMC token | 未声明 |
| 480 | mailgraph-knowledge-base | `GET` | `/api/v1/public/knowledge/files` | `mailgraph-knowledge-base-public_knowledge_files` | List anonymous knowledge file metadata | 未声明 |
| 481 | mailgraph-knowledge-base | `GET` | `/api/v1/public/knowledge/files/page` | `mailgraph-knowledge-base-public_knowledge_files_page` | Page anonymous knowledge file metadata | 未声明 |
| 482 | mailgraph-knowledge-base | `GET` | `/api/v1/public/knowledge/folders/tree` | `mailgraph-knowledge-base-public_knowledge_folder_tree` | List anonymous knowledge folders | 未声明 |
| 483 | mailgraph-knowledge-base | `POST` | `/api/v1/public/knowledge/search` | `mailgraph-knowledge-base-public_knowledge_search` | Search anonymous knowledge | 未声明 |
| 484 | question-generation | `GET` | `/api/v1/question-generation/jobs` | `question-generation-list_question_generation_jobs` | List question-generation jobs | OAuth2PasswordBearer |
| 485 | question-generation | `POST` | `/api/v1/question-generation/jobs` | `question-generation-create_question_generation_job` | Generate questions and optionally backfill an existing exam paper | OAuth2PasswordBearer |
| 486 | question-generation | `GET` | `/api/v1/question-generation/jobs/{job_id}` | `question-generation-get_question_generation_job` | Get a question-generation job | OAuth2PasswordBearer |
| 487 | question-generation | `POST` | `/api/v1/question-generation/jobs/{job_id}/sync-to-exam` | `question-generation-sync_question_generation_job_to_exam` | Retry syncing a generated job to the Exam API | OAuth2PasswordBearer |
| 488 | rbac | `GET` | `/api/v1/rbac/me` | `rbac-read_current_rbac_profile` | Read Current Rbac Profile | OAuth2PasswordBearer |
| 489 | redis | `GET` | `/api/v1/redis/health/` | `redis-redis_health_check` | Redis Health Check | OAuth2PasswordBearer |
| 490 | redis | `GET` | `/api/v1/redis/keys/` | `redis-list_redis_keys` | List Redis Keys | OAuth2PasswordBearer |
| 491 | redis | `POST` | `/api/v1/redis/keys/` | `redis-create_redis_key` | Create Redis Key | OAuth2PasswordBearer |
| 492 | redis | `GET` | `/api/v1/redis/keys/{key}` | `redis-read_redis_key` | Read Redis Key | OAuth2PasswordBearer |
| 493 | redis | `PUT` | `/api/v1/redis/keys/{key}` | `redis-update_redis_key` | Update Redis Key | OAuth2PasswordBearer |
| 494 | redis | `DELETE` | `/api/v1/redis/keys/{key}` | `redis-delete_redis_key` | Delete Redis Key | OAuth2PasswordBearer |
| 495 | login | `POST` | `/api/v1/reset-password/` | `login-reset_password` | Reset Password | 未声明 |
| 496 | 安全边界 | `POST` | `/api/v1/security-boundary/checks/environment` | `安全边界-check_security_boundary_environment` | 检查运行环境是否在批准范围内 | OAuth2PasswordBearer |
| 497 | 安全边界 | `POST` | `/api/v1/security-boundary/checks/outbound` | `安全边界-check_security_boundary_outbound` | 检查外联目标是否在批准范围内 | OAuth2PasswordBearer |
| 498 | 安全边界 | `POST` | `/api/v1/security-boundary/checks/runtime-path` | `安全边界-check_security_boundary_runtime_path` | 检查运行路径是否位于批准根目录下 | OAuth2PasswordBearer |
| 499 | 安全边界 | `POST` | `/api/v1/security-boundary/checks/storage` | `安全边界-check_security_boundary_storage` | 检查对象存储目标是否在批准范围内 | OAuth2PasswordBearer |
| 500 | 安全边界 | `GET` | `/api/v1/security-boundary/config` | `安全边界-get_security_boundary_config` | 查看当前安全边界配置 | OAuth2PasswordBearer |
| 501 | 安全边界 | `PATCH` | `/api/v1/security-boundary/config` | `安全边界-update_security_boundary_config` | 更新当前安全边界配置 | OAuth2PasswordBearer |
| 502 | 安全边界 | `POST` | `/api/v1/security-boundary/deployment-checks` | `安全边界-run_security_boundary_deployment_check` | 执行安全边界部署检查 | OAuth2PasswordBearer |
| 503 | 安全边界 | `GET` | `/api/v1/security-boundary/deployment-checks/latest` | `安全边界-get_latest_security_boundary_deployment_check` | 查看最近一次安全边界部署检查 | OAuth2PasswordBearer |
| 504 | 安全边界 | `GET` | `/api/v1/security-boundary/health` | `安全边界-security_boundary_health` | 检查安全边界服务就绪状态 | OAuth2PasswordBearer |
| 505 | 安全边界 | `GET` | `/api/v1/security-boundary/openapi.json` | `安全边界-security_boundary_openapi` | 获取安全边界服务 OpenAPI 文档 | OAuth2PasswordBearer |
| 506 | 安全边界 | `GET` | `/api/v1/security-boundary/violations` | `安全边界-list_security_boundary_violations` | 查询安全边界违规事件 | OAuth2PasswordBearer |
| 507 | storage | `GET` | `/api/v1/storage/buckets/` | `storage-list_buckets` | List Buckets | OAuth2PasswordBearer |
| 508 | storage | `POST` | `/api/v1/storage/buckets/` | `storage-create_bucket` | Create Bucket | OAuth2PasswordBearer |
| 509 | storage | `PATCH` | `/api/v1/storage/buckets/{bucket_name}` | `storage-rename_bucket` | Rename Bucket | OAuth2PasswordBearer |
| 510 | storage | `DELETE` | `/api/v1/storage/buckets/{bucket_name}` | `storage-delete_bucket` | Delete Bucket | OAuth2PasswordBearer |
| 511 | storage | `POST` | `/api/v1/storage/buckets/{bucket_name}/files` | `storage-upload_file_to_bucket` | Upload File To Bucket | OAuth2PasswordBearer |
| 512 | storage | `GET` | `/api/v1/storage/files/{bucket_name}/{object_name}` | `storage-read_public_file` | Read a public stored file | 未声明 |
| 513 | dev-tasks | `GET` | `/api/v1/tasks/` | `dev-tasks-list_dev_tasks` | List Dev Tasks | 未声明 |
| 514 | dev-tasks | `POST` | `/api/v1/tasks/` | `dev-tasks-create_dev_task` | Create Dev Task | 未声明 |
| 515 | dev-tasks | `GET` | `/api/v1/tasks/{task_id}` | `dev-tasks-read_dev_task` | Read Dev Task | 未声明 |
| 516 | dev-tasks | `GET` | `/api/v1/tasks/{task_id}/events` | `dev-tasks-read_dev_task_events` | Read Dev Task Events | 未声明 |
| 517 | dev-tasks | `POST` | `/api/v1/tasks/{task_id}/process-once` | `dev-tasks-process_dev_task_once` | Process Dev Task Once | OAuth2PasswordBearer |
| 518 | dev-tasks | `POST` | `/api/v1/tasks/{task_id}/resume` | `dev-tasks-resume_dev_task` | Resume Dev Task | OAuth2PasswordBearer |
| 519 | tools | `GET` | `/api/v1/tools` | `tools-list_tools` | List visible read-only tools for the current organization | OAuth2PasswordBearer |
| 520 | ppt-master | `GET` | `/api/v1/tools/ppt-master/health` | `ppt-master-health` | Check PPT Master service health | OAuth2PasswordBearer |
| 521 | ppt-master | `POST` | `/api/v1/tools/ppt-master/jobs` | `ppt-master-create_job` | Create a PPT Master job | OAuth2PasswordBearer |
| 522 | ppt-master | `GET` | `/api/v1/tools/ppt-master/jobs/{job_id}` | `ppt-master-get_job` | Get a PPT Master job | OAuth2PasswordBearer |
| 523 | ppt-master | `GET` | `/api/v1/tools/ppt-master/jobs/{job_id}/artifacts/{artifact_path}` | `ppt-master-download_artifact` | Download a PPT Master artifact | OAuth2PasswordBearer |
| 524 | ppt-master | `POST` | `/api/v1/tools/ppt-master/jobs/{job_id}/export` | `ppt-master-export_pptx` | Export PPT Master SVG slides to PPTX | OAuth2PasswordBearer |
| 525 | ppt-master | `POST` | `/api/v1/tools/ppt-master/jobs/{job_id}/slides/svg` | `ppt-master-add_svg_slide` | Add an SVG slide to a PPT Master job | OAuth2PasswordBearer |
| 526 | ppt-master | `POST` | `/api/v1/tools/ppt-master/jobs/{job_id}/sources/markdown` | `ppt-master-add_markdown_source` | Add a Markdown source file to a PPT Master job | OAuth2PasswordBearer |
| 527 | tools | `POST` | `/api/v1/tools/web-research` | `tools-web_research` | Run web search, page parsing, cleanup, and evidence slotting | OAuth2PasswordBearer |
| 528 | tools | `GET` | `/api/v1/tools/{tool_ref}` | `tools-get_tool_detail` | Read one visible read-only tool declaration | OAuth2PasswordBearer |
| 529 | tools | `POST` | `/api/v1/tools/{tool_ref}/invoke` | `tools-invoke_tool` | Invoke one visible read-only tool through the fixed plugin gateway | OAuth2PasswordBearer |
| 530 | users | `GET` | `/api/v1/users/` | `users-read_users` | Read Users | OAuth2PasswordBearer |
| 531 | users | `POST` | `/api/v1/users/` | `users-create_user` | Create User | OAuth2PasswordBearer |
| 532 | users | `GET` | `/api/v1/users/me` | `users-read_user_me` | Read User Me | OAuth2PasswordBearer |
| 533 | users | `PATCH` | `/api/v1/users/me` | `users-update_user_me` | Update User Me | OAuth2PasswordBearer |
| 534 | users | `DELETE` | `/api/v1/users/me` | `users-delete_user_me` | Delete User Me | OAuth2PasswordBearer |
| 535 | users | `PATCH` | `/api/v1/users/me/password` | `users-update_password_me` | Update Password Me | OAuth2PasswordBearer |
| 536 | users | `GET` | `/api/v1/users/{user_id}` | `users-read_user_by_id` | Read User By Id | OAuth2PasswordBearer |
| 537 | users | `PATCH` | `/api/v1/users/{user_id}` | `users-update_user` | Update User | OAuth2PasswordBearer |
| 538 | users | `DELETE` | `/api/v1/users/{user_id}` | `users-delete_user` | Delete User | OAuth2PasswordBearer |
| 539 | utils | `GET` | `/api/v1/utils/health-check/` | `utils-health_check` | Health Check | 未声明 |
| 540 | utils | `POST` | `/api/v1/utils/test-email/` | `utils-test_email` | Test Email | OAuth2PasswordBearer |
| 541 | workflow-proxy | `GET` | `/api/v1/workflow-admin` | `workflow-proxy-proxy_workflow_admin` | Proxy Workflow Admin | OAuth2PasswordBearer |
| 542 | workflow-proxy | `GET` | `/api/v1/workflow-admin/{path}` | `workflow-proxy-proxy_workflow_admin` | Proxy Workflow Admin | OAuth2PasswordBearer |
| 543 | workflow-proxy | `POST` | `/api/v1/workflow-admin/{path}` | `workflow-proxy-proxy_workflow_admin` | Proxy Workflow Admin | OAuth2PasswordBearer |
| 544 | workflow-proxy | `PUT` | `/api/v1/workflow-admin/{path}` | `workflow-proxy-proxy_workflow_admin` | Proxy Workflow Admin | OAuth2PasswordBearer |
| 545 | workflow-proxy | `PATCH` | `/api/v1/workflow-admin/{path}` | `workflow-proxy-proxy_workflow_admin` | Proxy Workflow Admin | OAuth2PasswordBearer |
| 546 | workflow-proxy | `DELETE` | `/api/v1/workflow-admin/{path}` | `workflow-proxy-proxy_workflow_admin` | Proxy Workflow Admin | OAuth2PasswordBearer |
| 547 | workflow-proxy | `GET` | `/api/v1/workflow-apps` | `workflow-proxy-proxy_workflow_apps` | Proxy Workflow Apps | OAuth2PasswordBearer |
| 548 | workflow-proxy | `POST` | `/api/v1/workflow-apps` | `workflow-proxy-proxy_workflow_apps` | Proxy Workflow Apps | OAuth2PasswordBearer |
| 549 | workflow-proxy | `GET` | `/api/v1/workflow-apps/{path}` | `workflow-proxy-proxy_workflow_apps` | Proxy Workflow Apps | OAuth2PasswordBearer |
| 550 | workflow-proxy | `POST` | `/api/v1/workflow-apps/{path}` | `workflow-proxy-proxy_workflow_apps` | Proxy Workflow Apps | OAuth2PasswordBearer |
| 551 | workflow-proxy | `PUT` | `/api/v1/workflow-apps/{path}` | `workflow-proxy-proxy_workflow_apps` | Proxy Workflow Apps | OAuth2PasswordBearer |
| 552 | workflow-proxy | `PATCH` | `/api/v1/workflow-apps/{path}` | `workflow-proxy-proxy_workflow_apps` | Proxy Workflow Apps | OAuth2PasswordBearer |
| 553 | workflow-proxy | `DELETE` | `/api/v1/workflow-apps/{path}` | `workflow-proxy-proxy_workflow_apps` | Proxy Workflow Apps | OAuth2PasswordBearer |
| 554 | workflow-proxy | `GET` | `/api/v1/workflow-conversations/{path}` | `workflow-proxy-proxy_workflow_conversations` | Proxy Workflow Conversations | OAuth2PasswordBearer |
| 555 | workflow-proxy | `POST` | `/api/v1/workflow-conversations/{path}` | `workflow-proxy-proxy_workflow_conversations` | Proxy Workflow Conversations | OAuth2PasswordBearer |
| 556 | workflow-proxy | `PUT` | `/api/v1/workflow-conversations/{path}` | `workflow-proxy-proxy_workflow_conversations` | Proxy Workflow Conversations | OAuth2PasswordBearer |
| 557 | workflow-proxy | `PATCH` | `/api/v1/workflow-conversations/{path}` | `workflow-proxy-proxy_workflow_conversations` | Proxy Workflow Conversations | OAuth2PasswordBearer |
| 558 | workflow-proxy | `DELETE` | `/api/v1/workflow-conversations/{path}` | `workflow-proxy-proxy_workflow_conversations` | Proxy Workflow Conversations | OAuth2PasswordBearer |
| 559 | runtime-proxy | `GET` | `/runtime/{runtime_path}` | `runtime-proxy-proxy_docker_runtime` | Proxy Docker runtime deployment requests | 未声明 |
| 560 | runtime-proxy | `POST` | `/runtime/{runtime_path}` | `runtime-proxy-proxy_docker_runtime` | Proxy Docker runtime deployment requests | 未声明 |
| 561 | runtime-proxy | `PUT` | `/runtime/{runtime_path}` | `runtime-proxy-proxy_docker_runtime` | Proxy Docker runtime deployment requests | 未声明 |
| 562 | runtime-proxy | `PATCH` | `/runtime/{runtime_path}` | `runtime-proxy-proxy_docker_runtime` | Proxy Docker runtime deployment requests | 未声明 |
| 563 | runtime-proxy | `DELETE` | `/runtime/{runtime_path}` | `runtime-proxy-proxy_docker_runtime` | Proxy Docker runtime deployment requests | 未声明 |
| 564 | runtime-proxy | `OPTIONS` | `/runtime/{runtime_path}` | `runtime-proxy-proxy_docker_runtime` | Proxy Docker runtime deployment requests | 未声明 |
| 565 | runtime-proxy | `HEAD` | `/runtime/{runtime_path}` | `runtime-proxy-proxy_docker_runtime` | Proxy Docker runtime deployment requests | 未声明 |
| 566 | agent-chat-websocket | `GET` | `/webui/bootstrap` | `agent-chat-websocket-get_websocket_bootstrap` | Get Websocket Bootstrap | OAuth2PasswordBearer |

## 按 Tag 展开接口

### Tag：agent-chat-websocket

#### 1. `GET /webui/bootstrap`

- 摘要：Get Websocket Bootstrap
- Operation ID：`agent-chat-websocket-get_websocket_bootstrap`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WebsocketBootstrapPublic` |

---

### Tag：agent-conversations

#### 2. `GET /api/conversations`

- 摘要：List Conversations
- Operation ID：`agent-conversations-list_conversations`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `project_id` | `query` | 否 | `anyOf(string, null)` |  | 可选：仅返回指定项目下的会话 |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ConversationListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 3. `POST /api/conversations`

- 摘要：Create Conversation
- Operation ID：`agent-conversations-create_conversation`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `ConversationCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ConversationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 4. `GET /api/conversations/{conversation_id}`

- 摘要：Get Conversation
- Operation ID：`agent-conversations-get_conversation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `conversation_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ConversationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 5. `DELETE /api/conversations/{conversation_id}`

- 摘要：Delete Conversation
- Operation ID：`agent-conversations-delete_conversation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `conversation_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ConversationDeleteResult` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 6. `GET /api/conversations/{conversation_id}/messages`

- 摘要：Get Conversation Messages
- Operation ID：`agent-conversations-get_conversation_messages`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `conversation_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ConversationMessagesPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 7. `POST /api/conversations/{conversation_id}/messages`

- 摘要：Update Conversation Messages
- Operation ID：`agent-conversations-update_conversation_messages`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `conversation_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ConversationMessagesUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ConversationMessagesPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 8. `GET /api/conversations/{conversation_id}/pending-task-confirmation`

- 摘要：Get Pending Task Confirmation
- Operation ID：`agent-conversations-get_pending_task_confirmation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `conversation_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ConversationPendingTaskConfirmationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：ai-chat

#### 9. `GET /api/v1/ai-chat/config`

- 摘要：Get Ai Chat Config
- Operation ID：`ai-chat-get_ai_chat_config`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AiChatConfig` |

---

#### 10. `GET /api/v1/ai-chat/conversations`

- 摘要：List Ai Conversations
- Operation ID：`ai-chat-list_ai_conversations`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AiConversationsPublic` |

---

#### 11. `DELETE /api/v1/ai-chat/conversations/{conversation_id}`

- 摘要：Delete Ai Conversation
- Operation ID：`ai-chat-delete_ai_conversation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `conversation_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `401` | Invalid or expired UMC AI session |  |
| `404` | AI conversation not found |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 12. `GET /api/v1/ai-chat/conversations/{conversation_id}/messages`

- 摘要：List Ai Conversation Messages
- Operation ID：`ai-chat-list_ai_conversation_messages`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `conversation_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AiChatMessagesPublic` |
| `401` | Invalid or expired UMC AI session |  |
| `404` | AI conversation not found |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 13. `POST /api/v1/ai-chat/messages/stream`

- 摘要：Stream Ai Chat Message
- Operation ID：`ai-chat-stream_ai_chat_message`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `AiChatMessageRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：ai-generation-service

#### 14. `GET /api/v1/ai-generation/api/ai/knowledge/datasets`

- 摘要：List RAGFlow datasets
- Operation ID：`ai-generation-service-list_ai_generation_datasets`
- 说明：The platform derives tenant and subject identity from the authenticated user and forwards trusted X-FF-* headers to AI Generation Service. Client-supplied identity headers are ignored.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `page` | `query` | 否 | `anyOf(integer, null)` |  |  |  |
| `page_size` | `query` | 否 | `anyOf(integer, null)` |  |  |  |
| `name` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `403` | Current user has no primary organization |  |
| `502` | AI Generation Service dataset request failed |  |
| `504` | AI Generation Service dataset request timed out |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 15. `POST /api/v1/ai-generation/api/ai/knowledge/datasets`

- 摘要：Create a RAGFlow dataset
- Operation ID：`ai-generation-service-create_ai_generation_dataset`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 16. `DELETE /api/v1/ai-generation/api/ai/knowledge/datasets`

- 摘要：Delete RAGFlow datasets
- Operation ID：`ai-generation-service-delete_ai_generation_datasets`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 17. `GET /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}`

- 摘要：Get a RAGFlow dataset
- Operation ID：`ai-generation-service-get_ai_generation_dataset`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 18. `PUT /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}`

- 摘要：Update a RAGFlow dataset
- Operation ID：`ai-generation-service-update_ai_generation_dataset`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 19. `DELETE /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}`

- 摘要：Delete a RAGFlow dataset
- Operation ID：`ai-generation-service-delete_ai_generation_dataset`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 20. `GET /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents`

- 摘要：List RAGFlow dataset documents
- Operation ID：`ai-generation-service-list_ai_generation_dataset_documents`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |
| `page` | `query` | 否 | `anyOf(integer, null)` |  |  |  |
| `page_size` | `query` | 否 | `anyOf(integer, null)` |  |  |  |
| `name` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 21. `POST /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents`

- 摘要：Upload RAGFlow dataset documents
- Operation ID：`ai-generation-service-upload_ai_generation_dataset_documents`
- 说明：Upload one or more documents to a RAGFlow dataset through AI Generation Service. The platform derives tenant and subject identity from the authenticated user and forwards trusted X-FF-* headers to AI Generation Service. Client-supplied identity headers are ignored. Each file may be up to 500MB by default; configure AI_GENERATION_DOCUMENT_UPLOAD_MAX_BYTES to change the platform-side limit.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |
| `parent_path` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`multipart/form-data`: `Body_ai-generation-service-upload_ai_generation_dataset_documents`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `403` | Current user has no primary organization |  |
| `413` | A file exceeds the configured 500MB upload limit |  |
| `502` | AI Generation Service upload failed |  |
| `504` | AI Generation Service upload timed out |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 22. `DELETE /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents`

- 摘要：Delete RAGFlow dataset documents
- Operation ID：`ai-generation-service-delete_ai_generation_dataset_documents`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 23. `POST /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents/parse`

- 摘要：Parse RAGFlow dataset documents
- Operation ID：`ai-generation-service-parse_ai_generation_dataset_documents`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 24. `GET /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents/{document_id}`

- 摘要：Get a RAGFlow dataset document
- Operation ID：`ai-generation-service-get_ai_generation_dataset_document`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |
| `document_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 25. `DELETE /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/documents/{document_id}`

- 摘要：Delete a RAGFlow dataset document
- Operation ID：`ai-generation-service-delete_ai_generation_dataset_document`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |
| `document_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 26. `POST /api/v1/ai-generation/api/ai/knowledge/datasets/{dataset_id}/search`

- 摘要：Search a RAGFlow dataset
- Operation ID：`ai-generation-service-search_ai_generation_dataset`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `dataset_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 27. `POST /api/v1/ai-generation/api/ai/knowledge/search`

- 摘要：Search AI generation knowledge
- Operation ID：`ai-generation-service-search_ai_generation_knowledge`
- 说明：The platform derives tenant and subject identity from the authenticated user and forwards trusted X-FF-* headers to AI Generation Service. Client-supplied identity headers are ignored.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `403` | Current user has no primary organization |  |
| `502` | AI Generation Service search failed |  |
| `504` | AI Generation Service search timed out |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 28. `POST /api/v1/ai-generation/api/ai/model/v1/chat/completions`

- 摘要：Proxy chat completions
- Operation ID：`ai-generation-service-proxy_ai_generation_chat_completions`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 29. `POST /api/v1/ai-generation/api/ai/model/v1/responses`

- 摘要：Proxy model responses
- Operation ID：`ai-generation-service-proxy_ai_generation_responses`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 30. `POST /api/v1/ai-generation/api/ai/quality/check`

- 摘要：Run AI generation quality checks
- Operation ID：`ai-generation-service-check_ai_generation_quality`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 31. `POST /api/v1/ai-generation/api/ai/runs`

- 摘要：Create an AI generation run
- Operation ID：`ai-generation-service-create_ai_generation_run`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 32. `GET /api/v1/ai-generation/api/ai/runs/{run_id}`

- 摘要：Get an AI generation run
- Operation ID：`ai-generation-service-get_ai_generation_run`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `run_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 33. `POST /api/v1/ai-generation/api/ai/runs/{run_id}/cancel`

- 摘要：Cancel an AI generation run
- Operation ID：`ai-generation-service-cancel_ai_generation_run`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `run_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 34. `GET /api/v1/ai-generation/api/ai/runs/{run_id}/events`

- 摘要：List AI generation run events
- Operation ID：`ai-generation-service-list_ai_generation_run_events`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `run_id` | `path` | 是 | `string` |  |  |  |
| `stream` | `query` | 否 | `boolean` | default=False |  | False |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 35. `POST /api/v1/ai-generation/api/ai/runs/{run_id}/retry`

- 摘要：Retry an AI generation run
- Operation ID：`ai-generation-service-retry_ai_generation_run`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `run_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 36. `GET /api/v1/ai-generation/api/ai/skills`

- 摘要：List AI generation skills
- Operation ID：`ai-generation-service-list_ai_generation_skills`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `category` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 37. `POST /api/v1/ai-generation/api/ai/skills`

- 摘要：Create an AI generation skill
- Operation ID：`ai-generation-service-create_ai_generation_skill`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 38. `POST /api/v1/ai-generation/api/ai/skills/export/hermes`

- 摘要：Export AI generation skills to Hermes
- Operation ID：`ai-generation-service-export_ai_generation_skills_to_hermes`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 39. `POST /api/v1/ai-generation/api/ai/skills/match`

- 摘要：Match AI generation skills
- Operation ID：`ai-generation-service-match_ai_generation_skills`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 40. `POST /api/v1/ai-generation/api/ai/skills/reload`

- 摘要：Reload AI generation skills
- Operation ID：`ai-generation-service-reload_ai_generation_skills`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 41. `GET /api/v1/ai-generation/api/ai/skills/{skill_id}`

- 摘要：Get an AI generation skill
- Operation ID：`ai-generation-service-get_ai_generation_skill`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 42. `PATCH /api/v1/ai-generation/api/ai/skills/{skill_id}`

- 摘要：Update an AI generation skill
- Operation ID：`ai-generation-service-update_ai_generation_skill`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 43. `DELETE /api/v1/ai-generation/api/ai/skills/{skill_id}`

- 摘要：Delete an AI generation skill
- Operation ID：`ai-generation-service-delete_ai_generation_skill`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 44. `GET /api/v1/ai-generation/api/ai/tasks/{task_id}/artifacts`

- 摘要：List AI generation task artifacts
- Operation ID：`ai-generation-service-list_ai_generation_task_artifacts`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 45. `POST /api/v1/ai-generation/api/ai/tasks/{task_id}/quality`

- 摘要：Run quality checks for a task
- Operation ID：`ai-generation-service-check_ai_generation_task_quality`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 46. `POST /api/v1/ai-generation/api/ai/tasks/{task_id}/resume`

- 摘要：Resume AI generation for a task
- Operation ID：`ai-generation-service-resume_ai_generation_task`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 47. `GET /api/v1/ai-generation/health`

- 摘要：Check AI Generation Service health
- Operation ID：`ai-generation-service-ai_generation_health`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 48. `GET /api/v1/ai-generation/runtime/status`

- 摘要：Inspect AI Generation Service runtime status
- Operation ID：`ai-generation-service-ai_generation_runtime_status`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

### Tag：ai-runtime

#### 49. `GET /api/v1/ai-runtime/status`

- 摘要：Inspect the active AI runtime
- Operation ID：`ai-runtime-ai_runtime_status`
- 说明：Returns the active AI runtime and probes its configured backend. When AI_RUNTIME=hermes, this checks the Hermes Agent API Server health and model list without exposing API keys.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AiRuntimeStatusPublic` |

---

### Tag：attachments

#### 50. `GET /api/v1/attachments`

- 摘要：List Attachments
- Operation ID：`attachments-list_attachments`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AttachmentListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 51. `POST /api/v1/attachments/upload`

- 摘要：Upload and parse an attachment
- Operation ID：`attachments-upload_attachment`
- 说明：Uploads a supported document or common image for the current user and parses it for chat/task use. Supported types: pdf, docx, txt, md, csv, xlsx, png, jpg, jpeg, gif, webp, bmp, svg, ico, avif, tif, tiff. PDF parsing returns text plus visual metadata when embedded images can be extracted; image uploads return visual metadata that points to the stored image.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`multipart/form-data`: `Body_attachments-upload_attachment`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `AttachmentPublic` |
| `400` | Invalid file or upload request |  |
| `413` | File exceeds the configured 500MB upload limit |  |
| `503` | Attachment storage unavailable |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 52. `GET /api/v1/attachments/{attachment_id}`

- 摘要：Get Attachment
- Operation ID：`attachments-get_attachment`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `attachment_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AttachmentPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：claw-code

#### 53. `POST /api/v1/claw/prompt`

- 摘要：Claw Prompt
- Operation ID：`claw-code-claw_prompt`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `ClawPromptRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ClawPromptResult` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 54. `GET /api/v1/claw/status`

- 摘要：Claw Status
- Operation ID：`claw-code-claw_status`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ClawStatus` |

---

### Tag：data-ingestion-proxy

#### 55. `GET /api/v1/access-endpoints`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 56. `POST /api/v1/access-endpoints`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 57. `PUT /api/v1/access-endpoints`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 58. `PATCH /api/v1/access-endpoints`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 59. `DELETE /api/v1/access-endpoints`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 60. `OPTIONS /api/v1/access-endpoints`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 61. `HEAD /api/v1/access-endpoints`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 62. `GET /api/v1/access-endpoints/{path}`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 63. `POST /api/v1/access-endpoints/{path}`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 64. `PUT /api/v1/access-endpoints/{path}`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 65. `PATCH /api/v1/access-endpoints/{path}`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 66. `DELETE /api/v1/access-endpoints/{path}`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 67. `OPTIONS /api/v1/access-endpoints/{path}`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 68. `HEAD /api/v1/access-endpoints/{path}`

- 摘要：Proxy access endpoint requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_access_endpoints`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 69. `POST /api/v1/data-gateway`

- 摘要：Proxy data gateway requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_gateway_root`
- 说明：Internal APISIX upstream. Requires the trusted gateway assertion and identity headers injected after JWT validation.
- 鉴权：`未声明`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `403` | Trusted APISIX gateway context is missing or invalid. |  |

---

#### 70. `POST /api/v1/data-gateway/{path}`

- 摘要：Proxy data gateway endpoint code requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_gateway`
- 说明：Internal APISIX upstream. Requires the trusted gateway assertion and identity headers injected after JWT validation.
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `403` | Trusted APISIX gateway context is missing or invalid. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 71. `GET /api/v1/data-ingestion/access-logs`

- 摘要：Proxy data access audit log requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 72. `POST /api/v1/data-ingestion/access-logs`

- 摘要：Proxy data access audit log requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 73. `PUT /api/v1/data-ingestion/access-logs`

- 摘要：Proxy data access audit log requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 74. `PATCH /api/v1/data-ingestion/access-logs`

- 摘要：Proxy data access audit log requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 75. `DELETE /api/v1/data-ingestion/access-logs`

- 摘要：Proxy data access audit log requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 76. `OPTIONS /api/v1/data-ingestion/access-logs`

- 摘要：Proxy data access audit log requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 77. `HEAD /api/v1/data-ingestion/access-logs`

- 摘要：Proxy data access audit log requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 78. `GET /api/v1/data-ingestion/access-logs/{path}`

- 摘要：Proxy data access audit log sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 79. `POST /api/v1/data-ingestion/access-logs/{path}`

- 摘要：Proxy data access audit log sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 80. `PUT /api/v1/data-ingestion/access-logs/{path}`

- 摘要：Proxy data access audit log sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 81. `PATCH /api/v1/data-ingestion/access-logs/{path}`

- 摘要：Proxy data access audit log sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 82. `DELETE /api/v1/data-ingestion/access-logs/{path}`

- 摘要：Proxy data access audit log sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 83. `OPTIONS /api/v1/data-ingestion/access-logs/{path}`

- 摘要：Proxy data access audit log sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 84. `HEAD /api/v1/data-ingestion/access-logs/{path}`

- 摘要：Proxy data access audit log sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_access_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 85. `GET /api/v1/data-ingestion/field-policies`

- 摘要：Proxy data ingestion field policy requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 86. `POST /api/v1/data-ingestion/field-policies`

- 摘要：Proxy data ingestion field policy requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 87. `PUT /api/v1/data-ingestion/field-policies`

- 摘要：Proxy data ingestion field policy requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 88. `PATCH /api/v1/data-ingestion/field-policies`

- 摘要：Proxy data ingestion field policy requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 89. `DELETE /api/v1/data-ingestion/field-policies`

- 摘要：Proxy data ingestion field policy requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 90. `OPTIONS /api/v1/data-ingestion/field-policies`

- 摘要：Proxy data ingestion field policy requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 91. `HEAD /api/v1/data-ingestion/field-policies`

- 摘要：Proxy data ingestion field policy requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 92. `GET /api/v1/data-ingestion/field-policies/{path}`

- 摘要：Proxy data ingestion field policy sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 93. `POST /api/v1/data-ingestion/field-policies/{path}`

- 摘要：Proxy data ingestion field policy sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 94. `PUT /api/v1/data-ingestion/field-policies/{path}`

- 摘要：Proxy data ingestion field policy sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 95. `PATCH /api/v1/data-ingestion/field-policies/{path}`

- 摘要：Proxy data ingestion field policy sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 96. `DELETE /api/v1/data-ingestion/field-policies/{path}`

- 摘要：Proxy data ingestion field policy sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 97. `OPTIONS /api/v1/data-ingestion/field-policies/{path}`

- 摘要：Proxy data ingestion field policy sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 98. `HEAD /api/v1/data-ingestion/field-policies/{path}`

- 摘要：Proxy data ingestion field policy sub-paths to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_field_policies`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 99. `POST /api/v1/data-ingestion/gateway-token`

- 摘要：Issue a data gateway token for the current user
- Operation ID：`data-ingestion-proxy-issue_data_gateway_token`
- 说明：Returns a short-lived JWT for the current login user. Use this token as Authorization: Bearer <token> when calling POST /api/v1/data-gateway/{endpoint_code}. The JWT subject is the current user ID, so the published field policy must bind the same user.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `DataGatewayTokenPublic` |
| `401` | Login token is missing. |  |
| `403` | Current user has no primary organization. |  |
| `503` | Data gateway token issuer is not configured. |  |

---

#### 100. `POST /api/v1/data-ingestion/gateway-token/users/{user_id}`

- 摘要：Issue a data gateway token for a specified user
- Operation ID：`data-ingestion-proxy-issue_data_gateway_token_for_user`
- 说明：Superuser-only helper for the user management page. Returns a short-lived data gateway JWT whose sub is the specified database user ID. The target user must be active and have a primary organization.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AdminDataGatewayTokenPublic` |
| `401` | Login token is missing. |  |
| `403` | Current user is not a superuser. |  |
| `404` | Target user is not found. |  |
| `503` | Data gateway token issuer is not configured. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 101. `GET /api/v1/data-ingestion/integrations`

- 摘要：Proxy data ingestion integration status requests
- Operation ID：`data-ingestion-proxy-proxy_data_ingestion_integrations`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 102. `GET /api/v1/data-sources`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 103. `POST /api/v1/data-sources`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 104. `PUT /api/v1/data-sources`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 105. `PATCH /api/v1/data-sources`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 106. `DELETE /api/v1/data-sources`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 107. `OPTIONS /api/v1/data-sources`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 108. `HEAD /api/v1/data-sources`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources_root`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 109. `GET /api/v1/data-sources/{path}`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 110. `POST /api/v1/data-sources/{path}`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 111. `PUT /api/v1/data-sources/{path}`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 112. `PATCH /api/v1/data-sources/{path}`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 113. `DELETE /api/v1/data-sources/{path}`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 114. `OPTIONS /api/v1/data-sources/{path}`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 115. `HEAD /api/v1/data-sources/{path}`

- 摘要：Proxy data source management requests to data_ingestion
- Operation ID：`data-ingestion-proxy-proxy_data_sources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 116. `POST /api/v1/public/data-access/{endpoint_code}`

- 摘要：Call a published UMC data endpoint with a UMC token
- Operation ID：`data-ingestion-proxy-proxy_public_umc_endpoint`
- 说明：Backend platform JWT is not required. The caller must provide an UMC Bearer token. The proxy uses an internal short-lived data-gateway JWT and forwards the UMC token only to the configured data-ingestion service as X-FF-Caller-Authorization.
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `endpoint_code` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Published endpoint response | `application/json`: object |
| `401` | UMC Bearer token is missing or malformed |  |
| `404` | Public UMC access is disabled or endpoint is not found |  |
| `503` | Public UMC access or data gateway is not configured |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：dev-tasks

#### 117. `GET /api/v1/tasks/`

- 摘要：List Dev Tasks
- Operation ID：`dev-tasks-list_dev_tasks`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tenant_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(`TaskStatus`, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=0; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `DevTasksPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 118. `POST /api/v1/tasks/`

- 摘要：Create Dev Task
- Operation ID：`dev-tasks-create_dev_task`
- 鉴权：`未声明`

**Request Body**

- Content-Type / Schema：`application/json`: `DevTaskCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `DevTaskSummary` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 119. `GET /api/v1/tasks/{task_id}`

- 摘要：Read Dev Task
- Operation ID：`dev-tasks-read_dev_task`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `DevTaskPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 120. `GET /api/v1/tasks/{task_id}/events`

- 摘要：Read Dev Task Events
- Operation ID：`dev-tasks-read_dev_task_events`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `DevTaskEventsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 121. `POST /api/v1/tasks/{task_id}/process-once`

- 摘要：Process Dev Task Once
- Operation ID：`dev-tasks-process_dev_task_once`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `DevTaskSummary` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 122. `POST /api/v1/tasks/{task_id}/resume`

- 摘要：Resume Dev Task
- Operation ID：`dev-tasks-resume_dev_task`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `DevTaskResume`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `DevTaskSummary` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：exam-api

#### 123. `GET /api/v1/exam/admin/attempts`

- 摘要：List all exam attempts as an administrator
- Operation ID：`exam-api-list_all_admin_attempts`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=100 |  | 100 |
| `paper_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `user_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 124. `GET /api/v1/exam/admin/attempts/{attempt_id}`

- 摘要：Get an exam attempt as an administrator
- Operation ID：`exam-api-get_admin_attempt`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `attempt_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 125. `GET /api/v1/exam/admin/exams`

- 摘要：List exam papers as an administrator
- Operation ID：`exam-api-list_admin_exams`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=100 |  | 100 |
| `sort` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `title` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `is_published` | `query` | 否 | `anyOf(boolean, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 126. `POST /api/v1/exam/admin/exams`

- 摘要：Create an exam paper as an administrator
- Operation ID：`exam-api-create_admin_exam`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 127. `GET /api/v1/exam/admin/exams/{paper_id}`

- 摘要：Get an exam paper as an administrator
- Operation ID：`exam-api-get_admin_exam`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 128. `PATCH /api/v1/exam/admin/exams/{paper_id}`

- 摘要：Update an exam paper as an administrator
- Operation ID：`exam-api-update_admin_exam`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 129. `DELETE /api/v1/exam/admin/exams/{paper_id}`

- 摘要：Delete an exam paper as an administrator
- Operation ID：`exam-api-delete_admin_exam`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 130. `GET /api/v1/exam/admin/exams/{paper_id}/attempts`

- 摘要：List attempts for an exam paper as an administrator
- Operation ID：`exam-api-list_admin_exam_attempts`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=100 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 131. `POST /api/v1/exam/admin/exams/{paper_id}/publish`

- 摘要：Publish an exam paper as an administrator
- Operation ID：`exam-api-publish_admin_exam`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 132. `GET /api/v1/exam/admin/exams/{paper_id}/question-accuracy`

- 摘要：Get question accuracy for an exam paper as an administrator
- Operation ID：`exam-api-get_admin_exam_question_accuracy`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 133. `GET /api/v1/exam/admin/exams/{paper_id}/questions`

- 摘要：List questions for an exam paper as an administrator
- Operation ID：`exam-api-list_admin_exam_questions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 134. `POST /api/v1/exam/admin/exams/{paper_id}/questions`

- 摘要：Create a question for an exam paper as an administrator
- Operation ID：`exam-api-create_admin_exam_question`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 135. `POST /api/v1/exam/admin/exams/{paper_id}/questions/import`

- 摘要：Import questions into an exam paper as an administrator
- Operation ID：`exam-api-import_admin_exam_questions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 136. `POST /api/v1/exam/admin/exams/{paper_id}/questions/link`

- 摘要：Link question bank items to an exam paper as an administrator
- Operation ID：`exam-api-link_admin_exam_questions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 137. `DELETE /api/v1/exam/admin/exams/{paper_id}/questions/{question_id}`

- 摘要：Unlink a question from an exam paper as an administrator
- Operation ID：`exam-api-unlink_admin_exam_question`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `question_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 138. `POST /api/v1/exam/admin/exams/{paper_id}/unpublish`

- 摘要：Unpublish an exam paper as an administrator
- Operation ID：`exam-api-unpublish_admin_exam`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 139. `GET /api/v1/exam/admin/questions`

- 摘要：List question bank items as an administrator
- Operation ID：`exam-api-list_admin_questions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=100 |  | 100 |
| `sort` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `text` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `difficulty` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `paper_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 140. `POST /api/v1/exam/admin/questions`

- 摘要：Create a question bank item as an administrator
- Operation ID：`exam-api-create_admin_question`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 141. `POST /api/v1/exam/admin/questions/import`

- 摘要：Import question bank items as an administrator
- Operation ID：`exam-api-import_admin_questions`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 142. `PATCH /api/v1/exam/admin/questions/{question_id}`

- 摘要：Update a question bank item as an administrator
- Operation ID：`exam-api-update_admin_question`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `question_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 143. `DELETE /api/v1/exam/admin/questions/{question_id}`

- 摘要：Delete a question bank item as an administrator
- Operation ID：`exam-api-delete_admin_question`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `question_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 144. `POST /api/v1/exam/agent/exams`

- 摘要：Create and publish an exam paper through the Exam API
- Operation ID：`exam-api-create_agent_exam`
- 说明：Proxies the request to POST /api/v1/agent/exams on ff-exam-api. The current platform Bearer token is forwarded to the Exam API.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: object |
| `401` | Missing or invalid platform token. |  |
| `403` | The downstream Exam API rejected the user. |  |
| `422` | The downstream Exam API rejected the payload. |  |
| `502` | The Exam API returned an invalid response or failed. |  |
| `503` | Exam API is not configured. |  |
| `504` | Exam API timed out. |  |

---

#### 145. `GET /api/v1/exam/attempts`

- 摘要：List exam attempts for the current user
- Operation ID：`exam-api-list_attempts`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=100 |  | 100 |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `paper_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 146. `GET /api/v1/exam/attempts/{attempt_id}`

- 摘要：Get the current user's exam attempt
- Operation ID：`exam-api-get_attempt`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `attempt_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 147. `PATCH /api/v1/exam/attempts/{attempt_id}/answers`

- 摘要：Save draft answers for the current user's exam attempt
- Operation ID：`exam-api-save_attempt_answers`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `attempt_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 148. `GET /api/v1/exam/attempts/{attempt_id}/result`

- 摘要：Get the current user's exam attempt result
- Operation ID：`exam-api-get_attempt_result`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `attempt_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 149. `POST /api/v1/exam/attempts/{attempt_id}/submit`

- 摘要：Submit answers for the current user's exam attempt
- Operation ID：`exam-api-submit_attempt`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `attempt_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 150. `GET /api/v1/exam/exams`

- 摘要：List exam papers visible to the current user
- Operation ID：`exam-api-list_exams`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=100 |  | 100 |
| `sort` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `title` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 151. `GET /api/v1/exam/exams/{paper_id}`

- 摘要：Get an exam paper visible to the current user
- Operation ID：`exam-api-get_exam`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 152. `POST /api/v1/exam/exams/{paper_id}/attempts`

- 摘要：Start an exam attempt for the current user
- Operation ID：`exam-api-create_exam_attempt`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `paper_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 153. `GET /api/v1/exam/health`

- 摘要：Check the Exam API readiness through the platform backend
- Operation ID：`exam-api-exam_health`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `503` | Exam API is not configured. |  |

---

#### 154. `GET /api/v1/exam/openapi.json`

- 摘要：Fetch the Exam API OpenAPI document through the platform backend
- Operation ID：`exam-api-exam_openapi`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

### Tag：grc

#### 155. `GET /api/v1/admin/grc/agents/{agent_id}/monitor`

- 摘要：Get Agent Monitor
- Operation ID：`grc-get_agent_monitor`
- 说明：Get active monitor for an agent.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: anyOf(`GrcPostDeployMonitorPublic`, null) |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 156. `POST /api/v1/admin/grc/agents/{agent_id}/monitors`

- 摘要：Start Agent Monitor
- Operation ID：`grc-start_agent_monitor`
- 说明：Start post-deployment monitoring for an agent.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcPostDeployMonitorPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 157. `GET /api/v1/admin/grc/agents/{agent_id}/release-status`

- 摘要：Get Agent Release Status
- Operation ID：`grc-get_agent_release_status`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 158. `GET /api/v1/admin/grc/audit-events`

- 摘要：List Audit Events
- Operation ID：`grc-list_audit_events`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `aggregate_type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `aggregate_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `event_type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `actor_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 159. `GET /api/v1/admin/grc/audit-events/verify-chain`

- 摘要：Verify Audit Chain
- Operation ID：`grc-verify_audit_chain`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `from_id` | `query` | 是 | `integer` | exclusiveMinimum=0 |  |  |
| `to_id` | `query` | 是 | `integer` | exclusiveMinimum=0 |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 160. `GET /api/v1/admin/grc/audit-events/{event_id}`

- 摘要：Get Audit Event
- Operation ID：`grc-get_audit_event`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `event_id` | `path` | 是 | `integer` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcAuditEventPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 161. `GET /api/v1/admin/grc/dashboard/overview`

- 摘要：Get Dashboard Overview
- Operation ID：`grc-get_dashboard_overview`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `days` | `query` | 否 | `integer` | default=30; minimum=1; maximum=365 |  | 30 |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcDashboardOverview` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 162. `GET /api/v1/admin/grc/evaluations`

- 摘要：List Evaluations
- Operation ID：`grc-list_evaluations`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `result` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `risk_level` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 163. `POST /api/v1/admin/grc/evaluations`

- 摘要：Run Evaluation
- Operation ID：`grc-run_evaluation`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `GrcEvaluationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 164. `GET /api/v1/admin/grc/evaluations/{evaluation_id}`

- 摘要：Get Evaluation
- Operation ID：`grc-get_evaluation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `evaluation_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcEvaluationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 165. `POST /api/v1/admin/grc/evaluations/{evaluation_id}/rerun`

- 摘要：Rerun Evaluation
- Operation ID：`grc-rerun_evaluation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `evaluation_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcEvaluationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 166. `GET /api/v1/admin/grc/evaluations/{evaluation_id}/results`

- 摘要：Get Evaluation Results
- Operation ID：`grc-get_evaluation_results`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `evaluation_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 167. `GET /api/v1/admin/grc/exceptions`

- 摘要：List Exceptions
- Operation ID：`grc-list_exceptions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `rule_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 168. `POST /api/v1/admin/grc/exceptions/{exception_id}/approve`

- 摘要：Approve Exception
- Operation ID：`grc-approve_exception`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `exception_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcExceptionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 169. `POST /api/v1/admin/grc/exceptions/{exception_id}/reject`

- 摘要：Reject Exception
- Operation ID：`grc-reject_exception`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `exception_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcExceptionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 170. `POST /api/v1/admin/grc/exceptions/{exception_id}/revoke`

- 摘要：Revoke Exception
- Operation ID：`grc-revoke_exception`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `exception_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcExceptionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 171. `GET /api/v1/admin/grc/monitors`

- 摘要：List Monitors
- Operation ID：`grc-list_monitors`
- 说明：List post-deployment monitors.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`GrcPostDeployMonitorPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 172. `POST /api/v1/admin/grc/monitors/check-due`

- 摘要：Trigger Due Checks
- Operation ID：`grc-trigger_due_checks`
- 说明：Trigger re-evaluation for all due monitors (cron job endpoint).
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 173. `POST /api/v1/admin/grc/monitors/{monitor_id}/acknowledge`

- 摘要：Acknowledge Monitor Anomaly
- Operation ID：`grc-acknowledge_monitor_anomaly`
- 说明：Acknowledge a detected anomaly.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `monitor_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcPostDeployMonitorPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 174. `POST /api/v1/admin/grc/monitors/{monitor_id}/stop`

- 摘要：Stop Agent Monitor
- Operation ID：`grc-stop_agent_monitor`
- 说明：Stop monitoring for an agent.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `monitor_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcPostDeployMonitorPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 175. `GET /api/v1/admin/grc/reports/compliance-trend`

- 摘要：Report Compliance Trend
- Operation ID：`grc-report_compliance_trend`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `days` | `query` | 否 | `integer` | default=30; minimum=1; maximum=365 |  | 30 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<object> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 176. `GET /api/v1/admin/grc/reports/exceptions`

- 摘要：Report Exceptions
- Operation ID：`grc-report_exceptions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `days` | `query` | 否 | `integer` | default=30; minimum=1; maximum=365 |  | 30 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 177. `POST /api/v1/admin/grc/reports/exports`

- 摘要：Export Report
- Operation ID：`grc-export_report`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 178. `GET /api/v1/admin/grc/reports/exports/{job_id}`

- 摘要：Get Export Status
- Operation ID：`grc-get_export_status`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 179. `GET /api/v1/admin/grc/reports/review-sla`

- 摘要：Report Review Sla
- Operation ID：`grc-report_review_sla`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `days` | `query` | 否 | `integer` | default=30; minimum=1; maximum=365 |  | 30 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 180. `GET /api/v1/admin/grc/reports/risk-distribution`

- 摘要：Report Risk Distribution
- Operation ID：`grc-report_risk_distribution`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `days` | `query` | 否 | `integer` | default=30; minimum=1; maximum=365 |  | 30 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<object> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 181. `GET /api/v1/admin/grc/reports/rule-hits`

- 摘要：Report Rule Hits
- Operation ID：`grc-report_rule_hits`
- 说明：Get per-rule hit metrics (total, pass/fail/error/review_required counts, hit_rate).
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `days` | `query` | 否 | `integer` | default=30; minimum=1; maximum=365 |  | 30 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<object> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 182. `GET /api/v1/admin/grc/reports/treatments`

- 摘要：Report Treatments
- Operation ID：`grc-report_treatments`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `days` | `query` | 否 | `integer` | default=30; minimum=1; maximum=365 |  | 30 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 183. `GET /api/v1/admin/grc/reviews`

- 摘要：List Reviews
- Operation ID：`grc-list_reviews`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `risk_level` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `assignee_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 184. `GET /api/v1/admin/grc/reviews/{case_id}`

- 摘要：Get Review
- Operation ID：`grc-get_review`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcReviewCasePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 185. `POST /api/v1/admin/grc/reviews/{case_id}/assign`

- 摘要：Assign Review
- Operation ID：`grc-assign_review`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcReviewCasePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 186. `POST /api/v1/admin/grc/reviews/{case_id}/cancel`

- 摘要：Cancel Review
- Operation ID：`grc-cancel_review`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 187. `GET /api/v1/admin/grc/reviews/{case_id}/decisions`

- 摘要：List Review Decisions
- Operation ID：`grc-list_review_decisions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`GrcReviewDecisionPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 188. `POST /api/v1/admin/grc/reviews/{case_id}/decisions`

- 摘要：Submit Review Decision
- Operation ID：`grc-submit_review_decision`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcReviewDecisionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 189. `POST /api/v1/admin/grc/reviews/{case_id}/evidence`

- 摘要：Attach Review Evidence
- Operation ID：`grc-attach_review_evidence`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 190. `POST /api/v1/admin/grc/reviews/{case_id}/exceptions`

- 摘要：Request Exception
- Operation ID：`grc-request_exception`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcExceptionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 191. `GET /api/v1/admin/grc/reviews/{case_id}/treatments`

- 摘要：List Review Treatments
- Operation ID：`grc-list_review_treatments`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`GrcRiskTreatmentPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 192. `POST /api/v1/admin/grc/reviews/{case_id}/treatments`

- 摘要：Create Treatment
- Operation ID：`grc-create_treatment`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRiskTreatmentPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 193. `GET /api/v1/admin/grc/risk-profiles`

- 摘要：List Risk Profiles
- Operation ID：`grc-list_risk_profiles`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `risk_level` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 194. `POST /api/v1/admin/grc/risk-profiles/assess`

- 摘要：Assess Risk Profile
- Operation ID：`grc-assess_risk_profile`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `GrcRiskProfileCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRiskProfilePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 195. `GET /api/v1/admin/grc/risk-profiles/{profile_id}`

- 摘要：Get Risk Profile
- Operation ID：`grc-get_risk_profile`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `profile_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRiskProfilePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 196. `PUT /api/v1/admin/grc/risk-profiles/{profile_id}`

- 摘要：Update Risk Profile
- Operation ID：`grc-update_risk_profile`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `profile_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `GrcRiskProfileUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRiskProfilePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 197. `GET /api/v1/admin/grc/rules`

- 摘要：List Rules
- Operation ID：`grc-list_rules`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `category` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `is_active` | `query` | 否 | `anyOf(boolean, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 198. `POST /api/v1/admin/grc/rules`

- 摘要：Create Rule
- Operation ID：`grc-create_rule`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `GrcRuleCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRulePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 199. `POST /api/v1/admin/grc/rules/test`

- 摘要：Test Rule Evaluator
- Operation ID：`grc-test_rule_evaluator`
- 说明：Dry-run an evaluator config against a user-supplied input snapshot.<br><br>Validates the config first; if valid, runs the matching evaluator against<br>the snapshot and returns result/message/evidence. Nothing is persisted.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 200. `POST /api/v1/admin/grc/rules/validate`

- 摘要：Validate Rule Evaluator
- Operation ID：`grc-validate_rule_evaluator`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 201. `GET /api/v1/admin/grc/rules/{rule_id}`

- 摘要：Get Rule
- Operation ID：`grc-get_rule`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `rule_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRulePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 202. `PATCH /api/v1/admin/grc/rules/{rule_id}`

- 摘要：Patch Rule
- Operation ID：`grc-patch_rule`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `rule_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `GrcRuleUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRulePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 203. `GET /api/v1/admin/grc/rules/{rule_id}/stats`

- 摘要：Get Rule Stats
- Operation ID：`grc-get_rule_stats`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `rule_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 204. `GET /api/v1/admin/grc/rules/{rule_id}/versions`

- 摘要：List Rule Versions
- Operation ID：`grc-list_rule_versions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `rule_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 205. `POST /api/v1/admin/grc/rules/{rule_id}/versions`

- 摘要：Create Rule Version
- Operation ID：`grc-create_rule_version`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `rule_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `GrcRuleVersionCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRuleVersionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 206. `POST /api/v1/admin/grc/rules/{rule_id}/versions/{version}/publish`

- 摘要：Publish Rule Version
- Operation ID：`grc-publish_rule_version`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `rule_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `version` | `path` | 是 | `integer` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `GrcRuleVersionPublish`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRuleVersionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 207. `POST /api/v1/admin/grc/rules/{rule_id}/versions/{version}/retire`

- 摘要：Retire Rule Version
- Operation ID：`grc-retire_rule_version`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `rule_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `version` | `path` | 是 | `integer` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRuleVersionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 208. `GET /api/v1/admin/grc/treatments`

- 摘要：List Treatments
- Operation ID：`grc-list_treatments`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `case_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `owner_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 209. `PATCH /api/v1/admin/grc/treatments/{treatment_id}`

- 摘要：Update Treatment
- Operation ID：`grc-update_treatment`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `treatment_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRiskTreatmentPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 210. `POST /api/v1/admin/grc/treatments/{treatment_id}/close`

- 摘要：Close Treatment
- Operation ID：`grc-close_treatment`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `treatment_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRiskTreatmentPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 211. `POST /api/v1/admin/grc/treatments/{treatment_id}/verify`

- 摘要：Verify Treatment
- Operation ID：`grc-verify_treatment`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `treatment_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `GrcRiskTreatmentPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：hermes-tools

#### 212. `POST /api/v1/hermes/tools/{tool_name}`

- 摘要：Execute a controlled Hermes backend tool
- Operation ID：`hermes-tools-execute_hermes_tool`
- 说明：Executes a single backend tool call from Hermes using the common tool envelope. Supported tool names: `task_draft.create`, `task_draft.get_pending`, `task_draft.update`, `task_draft.reject`, `task.confirm_create`, `task.transition`, `task_artifact.save`, `task_artifact.get`. The backend validates the current user, conversation, task ownership, state transitions, artifact types, idempotency key, and sensitive fields.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tool_name` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `HermesToolRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `HermesToolResponse` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：items

#### 213. `GET /api/v1/items/`

- 摘要：Read Items
- Operation ID：`items-read_items`
- 说明：Retrieve items.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ItemsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 214. `POST /api/v1/items/`

- 摘要：Create Item
- Operation ID：`items-create_item`
- 说明：Create new item.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `ItemCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ItemPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 215. `GET /api/v1/items/{id}`

- 摘要：Read Item
- Operation ID：`items-read_item`
- 说明：Get item by ID.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ItemPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 216. `PUT /api/v1/items/{id}`

- 摘要：Update Item
- Operation ID：`items-update_item`
- 说明：Update an item.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ItemUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ItemPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 217. `DELETE /api/v1/items/{id}`

- 摘要：Delete Item
- Operation ID：`items-delete_item`
- 说明：Delete an item.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：login

#### 218. `POST /api/v1/login/access-token`

- 摘要：Log in with platform credentials or an optional UMC Bearer token
- Operation ID：`login-login_access_token`
- 说明：Without an Authorization header, authenticates the submitted username and password using the original platform login flow. When a UMC Bearer token is present, it takes precedence: the UMC UserID is verified and mapped to the Customer/Admin platform account, falling back to the configured Admin account when no enabled mapping exists.
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  | Optional UMC Authorization header in the form Bearer <UMC_USER_TOKEN>. |  |

**Request Body**

- Content-Type / Schema：`application/x-www-form-urlencoded`: `Body_login-login_access_token`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Token` |
| `400` | The credentials are incorrect, incomplete, or inactive. |  |
| `401` | The UMC Bearer token is missing, invalid, expired, or rejected. |  |
| `403` | The verified UMC identity conflicts with an enabled mapping. |  |
| `502` | UMC or the data-ingestion verification path is unavailable. |  |
| `503` | Federated auth, role accounts, encryption, or Redis is unavailable. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 219. `POST /api/v1/login/chatbot-session`

- 摘要：Login Chatbot Session
- Operation ID：`login-login_chatbot_session`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `ChatbotSessionRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Token` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 220. `POST /api/v1/login/test-token`

- 摘要：Validate a platform access token
- Operation ID：`login-test_token`
- 说明：Validates the Bearer token and returns the active platform user, including the user's primary organization when one is assigned.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UserPublic` |
| `403` | The Bearer token is missing, invalid, or references an inactive user. |  |

---

#### 221. `POST /api/v1/login/umc/access-token`

- 摘要：Exchange a UMC user token for an isolated platform session
- Operation ID：`login-umc_access_token`
- 说明：Accepts the current UMC user's Bearer token and exchanges it for an isolated platform AI session. Admin Portal tokens are detected by POST /api/AdminUser/GetUserInfo and mapped to the configured Admin carrier; other valid UMC tokens are mapped to the configured Customer carrier. When no Authorization header is supplied, a Public carrier session is issued for knowledge-only chatbot access.
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  | Optional UMC Authorization header in the form Bearer <UMC_USER_TOKEN>. |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Token` |
| `401` | The UMC token is invalid, expired, or rejected. |  |
| `403` | The verified UMC identity conflicts with an enabled mapping. |  |
| `409` | The customer token is in Global View and a specific profile must be selected. |  |
| `502` | UMC or the data-ingestion verification path is unavailable. |  |
| `503` | Federated auth, role accounts, encryption, or Redis is unavailable. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 222. `POST /api/v1/password-recovery-html-content/{email}`

- 摘要：Recover Password Html Content
- Operation ID：`login-recover_password_html_content`
- 说明：HTML Content for Password Recovery
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `email` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `text/html`: string |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 223. `POST /api/v1/password-recovery/{email}`

- 摘要：Recover Password
- Operation ID：`login-recover_password`
- 说明：Password Recovery
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `email` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 224. `POST /api/v1/reset-password/`

- 摘要：Reset Password
- Operation ID：`login-reset_password`
- 说明：Reset password
- 鉴权：`未声明`

**Request Body**

- Content-Type / Schema：`application/json`: `NewPassword`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：mailgraph-knowledge-base

#### 225. `GET /api/v1/mailgraph/{path}`

- 摘要：访问邮件分析知识库
- Operation ID：`mailgraph-knowledge-base-proxy_mailgraph`
- 说明：使用当前平台 JWT 和 RBAC 权限访问内置 MailGraph Knowledge Base。平台会注入受网关密钥保护的用户、角色和组织身份，MailGraph 按角色交集过滤目录、文件和邮箱数据；邮件账户配置及服务器文件浏览操作额外要求 user.mailgraph.manage 权限。知识文件上传采用流式转发，单文件最大 500MB，代理请求最长等待 7200 秒。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | MailGraph 请求成功或流式响应已建立 | `application/json`: object |
| `403` | 用户无使用权限、管理权限或所属组织 |  |
| `413` | 知识文件单文件超过 500MB |  |
| `502` | MailGraph 上游服务请求失败 |  |
| `503` | MailGraph 上游服务未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 226. `POST /api/v1/mailgraph/{path}`

- 摘要：访问邮件分析知识库
- Operation ID：`mailgraph-knowledge-base-proxy_mailgraph`
- 说明：使用当前平台 JWT 和 RBAC 权限访问内置 MailGraph Knowledge Base。平台会注入受网关密钥保护的用户、角色和组织身份，MailGraph 按角色交集过滤目录、文件和邮箱数据；邮件账户配置及服务器文件浏览操作额外要求 user.mailgraph.manage 权限。知识文件上传采用流式转发，单文件最大 500MB，代理请求最长等待 7200 秒。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | MailGraph 请求成功或流式响应已建立 | `application/json`: object |
| `403` | 用户无使用权限、管理权限或所属组织 |  |
| `413` | 知识文件单文件超过 500MB |  |
| `502` | MailGraph 上游服务请求失败 |  |
| `503` | MailGraph 上游服务未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 227. `PUT /api/v1/mailgraph/{path}`

- 摘要：访问邮件分析知识库
- Operation ID：`mailgraph-knowledge-base-proxy_mailgraph`
- 说明：使用当前平台 JWT 和 RBAC 权限访问内置 MailGraph Knowledge Base。平台会注入受网关密钥保护的用户、角色和组织身份，MailGraph 按角色交集过滤目录、文件和邮箱数据；邮件账户配置及服务器文件浏览操作额外要求 user.mailgraph.manage 权限。知识文件上传采用流式转发，单文件最大 500MB，代理请求最长等待 7200 秒。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | MailGraph 请求成功或流式响应已建立 | `application/json`: object |
| `403` | 用户无使用权限、管理权限或所属组织 |  |
| `413` | 知识文件单文件超过 500MB |  |
| `502` | MailGraph 上游服务请求失败 |  |
| `503` | MailGraph 上游服务未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 228. `PATCH /api/v1/mailgraph/{path}`

- 摘要：访问邮件分析知识库
- Operation ID：`mailgraph-knowledge-base-proxy_mailgraph`
- 说明：使用当前平台 JWT 和 RBAC 权限访问内置 MailGraph Knowledge Base。平台会注入受网关密钥保护的用户、角色和组织身份，MailGraph 按角色交集过滤目录、文件和邮箱数据；邮件账户配置及服务器文件浏览操作额外要求 user.mailgraph.manage 权限。知识文件上传采用流式转发，单文件最大 500MB，代理请求最长等待 7200 秒。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | MailGraph 请求成功或流式响应已建立 | `application/json`: object |
| `403` | 用户无使用权限、管理权限或所属组织 |  |
| `413` | 知识文件单文件超过 500MB |  |
| `502` | MailGraph 上游服务请求失败 |  |
| `503` | MailGraph 上游服务未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 229. `DELETE /api/v1/mailgraph/{path}`

- 摘要：访问邮件分析知识库
- Operation ID：`mailgraph-knowledge-base-proxy_mailgraph`
- 说明：使用当前平台 JWT 和 RBAC 权限访问内置 MailGraph Knowledge Base。平台会注入受网关密钥保护的用户、角色和组织身份，MailGraph 按角色交集过滤目录、文件和邮箱数据；邮件账户配置及服务器文件浏览操作额外要求 user.mailgraph.manage 权限。知识文件上传采用流式转发，单文件最大 500MB，代理请求最长等待 7200 秒。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | MailGraph 请求成功或流式响应已建立 | `application/json`: object |
| `403` | 用户无使用权限、管理权限或所属组织 |  |
| `413` | 知识文件单文件超过 500MB |  |
| `502` | MailGraph 上游服务请求失败 |  |
| `503` | MailGraph 上游服务未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 230. `GET /api/v1/public/knowledge/files`

- 摘要：List anonymous knowledge file metadata
- Operation ID：`mailgraph-knowledge-base-public_knowledge_files`
- 说明：No Authorization header is required. folder_id remains dynamic, matching the authenticated knowledge API. Only safe file metadata is returned.
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `folder_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `recursive` | `query` | 否 | `boolean` | default=False |  | False |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `404` | Folder not found or public knowledge access is disabled |  |
| `502` | MailGraph unavailable |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 231. `GET /api/v1/public/knowledge/files/page`

- 摘要：Page anonymous knowledge file metadata
- Operation ID：`mailgraph-knowledge-base-public_knowledge_files_page`
- 说明：No Authorization header is required. folder_id remains dynamic, matching the authenticated knowledge API. Only safe file metadata is returned.
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `folder_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `recursive` | `query` | 否 | `boolean` | default=False |  | False |
| `keyword` | `query` | 否 | `string` | default=; maxLength=200 |  |  |
| `page` | `query` | 否 | `integer` | default=1; minimum=1 |  | 1 |
| `page_size` | `query` | 否 | `integer` | default=20; minimum=10; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `404` | Folder not found or public knowledge access is disabled |  |
| `422` | Invalid paging query |  |
| `502` | MailGraph unavailable |  |

---

#### 232. `GET /api/v1/public/knowledge/folders/tree`

- 摘要：List anonymous knowledge folders
- Operation ID：`mailgraph-knowledge-base-public_knowledge_folder_tree`
- 说明：No Authorization header is required. Returns the current tenant knowledge folder tree through a fixed trusted service identity.
- 鉴权：`未声明`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `404` | Public knowledge access is disabled |  |
| `502` | MailGraph unavailable |  |

---

#### 233. `POST /api/v1/public/knowledge/search`

- 摘要：Search anonymous knowledge
- Operation ID：`mailgraph-knowledge-base-public_knowledge_search`
- 说明：No Authorization header is required. The request body keeps the authenticated knowledge-search shape, including its dynamic folder_id. Upload, parse, delete, directory management, and original-file access remain authenticated.
- 鉴权：`未声明`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `400` | Request body is not a JSON object |  |
| `404` | Public knowledge access is disabled |  |
| `422` | Invalid search input |  |
| `502` | MailGraph unavailable |  |

---

### Tag：mock-security-scan

#### 234. `GET /api/v1/mock/security-scan/findings`

- 摘要：Get all mock security scan findings
- Operation ID：`mock-security-scan-get_security_scan_findings`
- 说明：Returns every row and column from the security scan workbook's '问题明细' worksheet. This endpoint is static and intended only for mock tests.
- 鉴权：`未声明`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `SecurityScanFindingsResponse` |

---

### Tag：my-request

#### 235. `POST /api/MyRequest/ApplicationPage`

- 摘要：List mock service applications
- Operation ID：`my-request-get_application_page`
- 说明：Returns deterministic bilingual mock application data for integration testing. No authentication is required. Status counts describe the full mock dataset, while applicationPage.items contains only the requested page.
- 鉴权：`未声明`

**Request Body**

- Content-Type / Schema：`application/json`: `ApplicationPageRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | The requested page was returned. | `application/json`: `ApplicationPageResponse` |
| `422` | pageIndex or pageSize is outside the supported range. |  |

---

### Tag：plugin-access-gateway

#### 236. `GET /api/v1/plugins/auth`

- 摘要：Authorize an Nginx auth_request for a plugin route
- Operation ID：`plugin-access-gateway-authorize_plugin_request_get`
- 说明：Validates login, tenant membership, installation and route state, and plugin scope. Identity and scope headers are returned for injection by Nginx.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `installation_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `service_name` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `path` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `method` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `trace_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `X-Original-URI` | `header` | 否 | `anyOf(string, null)` |  |  |  |
| `X-Original-Method` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginAuthDecisionPublic` |
| `401` | Not authenticated. |  |
| `403` | Tenant, installation, route, or scope denied access. |  |
| `404` | Plugin or installation not found. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 237. `POST /api/v1/plugins/auth`

- 摘要：Authorize a structured plugin gateway request
- Operation ID：`plugin-access-gateway-authorize_plugin_request_post`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `PluginAuthRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginAuthDecisionPublic` |
| `401` | Not authenticated. |  |
| `403` | Tenant, installation, route, or scope denied access. |  |
| `404` | Plugin or installation not found. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 238. `GET /api/v1/plugins/installed/menus`

- 摘要：List healthy plugin menu declarations visible to the current user
- Operation ID：`plugin-access-gateway-list_installed_plugin_menus`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginMenusPublic` |
| `401` | Not authenticated. |  |
| `403` | Organization access denied. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 239. `GET /api/v1/plugins/{plugin_id}/health`

- 摘要：Read and refresh the health of an installed plugin
- Operation ID：`plugin-access-gateway-read_plugin_health`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginHealthCheckPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin access denied. |  |
| `404` | Plugin installation not found. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 240. `GET /api/v1/plugins/{plugin_id}/openapi`

- 摘要：Read the last validated OpenAPI document for an installed plugin
- Operation ID：`plugin-access-gateway-read_plugin_openapi`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Stored plugin OpenAPI JSON. | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin access denied. |  |
| `404` | Plugin OpenAPI document not found. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 241. `GET /api/v1/plugins/{plugin_id}/proxy`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_root_get`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 242. `POST /api/v1/plugins/{plugin_id}/proxy`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_root_post`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 243. `PUT /api/v1/plugins/{plugin_id}/proxy`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_root_put`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 244. `PATCH /api/v1/plugins/{plugin_id}/proxy`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_root_patch`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 245. `DELETE /api/v1/plugins/{plugin_id}/proxy`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_root_delete`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 246. `OPTIONS /api/v1/plugins/{plugin_id}/proxy`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_root_options`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 247. `HEAD /api/v1/plugins/{plugin_id}/proxy`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_root_head`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 248. `GET /api/v1/plugins/{plugin_id}/proxy/{proxy_path}`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_path_get`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 249. `POST /api/v1/plugins/{plugin_id}/proxy/{proxy_path}`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_path_post`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 250. `PUT /api/v1/plugins/{plugin_id}/proxy/{proxy_path}`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_path_put`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 251. `PATCH /api/v1/plugins/{plugin_id}/proxy/{proxy_path}`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_path_patch`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 252. `DELETE /api/v1/plugins/{plugin_id}/proxy/{proxy_path}`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_path_delete`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 253. `OPTIONS /api/v1/plugins/{plugin_id}/proxy/{proxy_path}`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_path_options`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 254. `HEAD /api/v1/plugins/{plugin_id}/proxy/{proxy_path}`

- 摘要：Proxy a plugin API request through tenant and scope authorization
- Operation ID：`proxy_plugin_api_path_head`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 255. `GET /api/v1/plugins/{plugin_id}/ui`

- 摘要：Proxy plugin Web UI static content
- Operation ID：`proxy_plugin_ui_root_get`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 256. `HEAD /api/v1/plugins/{plugin_id}/ui`

- 摘要：Proxy plugin Web UI static content
- Operation ID：`proxy_plugin_ui_root_head`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 257. `POST /api/v1/plugins/{plugin_id}/ui-session`

- 摘要：Create a short-lived browser session for a plugin Web UI
- Operation ID：`plugin-access-gateway-create_plugin_ui_session`
- 说明：Validates the enabled installation, healthy UI service, active route, tenant membership, and plugin scope, then sets a five-minute HttpOnly cookie restricted to this plugin's gateway paths. The access token is never placed in the URL.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginUiSessionPublic` |
| `401` | Not authenticated. |  |
| `403` | Tenant, installation, route, or scope denied access. |  |
| `404` | Plugin or healthy UI service not found. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 258. `GET /api/v1/plugins/{plugin_id}/ui/{proxy_path}`

- 摘要：Proxy plugin Web UI static content
- Operation ID：`proxy_plugin_ui_path_get`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 259. `HEAD /api/v1/plugins/{plugin_id}/ui/{proxy_path}`

- 摘要：Proxy plugin Web UI static content
- Operation ID：`proxy_plugin_ui_path_head`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` |  |  |  |
| `proxy_path` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin scope denied. |  |
| `404` | Plugin route not found. |  |
| `502` | Plugin service is unavailable. |  |
| `504` | Plugin service timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：plugin-control-plane

#### 260. `POST /api/v1/plugins/builtin/exam/install`

- 摘要：Register the existing Exam API as an official built-in plugin installation
- Operation ID：`plugin-control-plane-install_builtin_exam_plugin`
- 说明：Registers or upgrades the monorepo Exam Web and Exam API images as a two-resource plugin installation while keeping legacy /api/v1/exam routes available for compatibility.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `BuiltinPluginInstallRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `BuiltinPluginInstallPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Exam API or plugin center is not configured. |  |
| `404` | Organization not found. |  |
| `409` | Installation resource state conflicts. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 261. `GET /api/v1/plugins/metrics`

- 摘要：Read aggregate plugin control-plane operational metrics
- Operation ID：`plugin-control-plane-read_plugin_metrics`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginMetricsPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |

---

#### 262. `GET /api/v1/plugins/operations`

- 摘要：List durable plugin operations
- Operation ID：`plugin-control-plane-list_plugin_operations`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `installation_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginOperationsPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 263. `GET /api/v1/plugins/operations/{operation_id}`

- 摘要：Read a durable plugin operation and all recorded steps
- Operation ID：`plugin-control-plane-read_plugin_operation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `operation_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Operation not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 264. `POST /api/v1/plugins/operations/{operation_id}/retry`

- 摘要：Retry a failed or rolled-back plugin operation
- Operation ID：`plugin-control-plane-retry_plugin_operation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `operation_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `execute_async` | `query` | 否 | `boolean` | default=True |  | True |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Operation not found. |  |
| `409` | Operation is not retryable. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 265. `POST /api/v1/plugins/routes/reload-nginx`

- 摘要：Render and publish the complete plugin Nginx configuration
- Operation ID：`plugin-control-plane-reload_plugin_nginx_routes`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginNginxReloadPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `500` | Configuration publication failed. |  |

---

#### 266. `GET /api/v1/plugins/{plugin_id}/audit-logs`

- 摘要：List immutable plugin control-plane audit events
- Operation ID：`plugin-control-plane-list_plugin_audits`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `action` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginAuditsPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 267. `POST /api/v1/plugins/{plugin_id}/billing-events`

- 摘要：Record an idempotent metered plugin billing event
- Operation ID：`plugin-control-plane-create_plugin_billing_event`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginBillingEventCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `PluginBillingEventPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation or billing rule not found. |  |
| `409` | Idempotency key already exists. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 268. `GET /api/v1/plugins/{plugin_id}/config`

- 摘要：Read non-secret plugin configuration and configured secret keys
- Operation ID：`plugin-control-plane-read_plugin_config`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginConfigPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 269. `PUT /api/v1/plugins/{plugin_id}/config`

- 摘要：Update tenant configuration and rotate write-only secrets
- Operation ID：`plugin-control-plane-update_plugin_config`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginConfigUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginConfigPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `422` | Configuration is not declared by the manifest. |  |

---

#### 270. `POST /api/v1/plugins/{plugin_id}/disable`

- 摘要：Disable one plugin installation while retaining data
- Operation ID：`plugin-control-plane-disable_plugin`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `409` | Operation conflicts. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 271. `GET /api/v1/plugins/{plugin_id}/dokku/logs`

- 摘要：Read bounded Dokku logs from one plugin app resource
- Operation ID：`plugin-control-plane-read_dokku_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |
| `resource_name` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `lines` | `query` | 否 | `integer` | default=200; minimum=1; maximum=1000 |  | 200 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginLogsPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation or app resource not found. |  |
| `502` | Dokku runtime failed. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 272. `POST /api/v1/plugins/{plugin_id}/dokku/redeploy-resource/{resource_name}`

- 摘要：Redeploy one bound Dokku app from its locked image
- Operation ID：`plugin-control-plane-redeploy_plugin_resource`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `resource_name` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{0,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation or resource not found. |  |
| `409` | Operation conflicts. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 273. `POST /api/v1/plugins/{plugin_id}/dokku/restart-resource/{resource_name}`

- 摘要：Restart one bound Dokku app resource
- Operation ID：`plugin-control-plane-restart_plugin_resource`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `resource_name` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{0,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation or resource not found. |  |
| `409` | Operation conflicts. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 274. `GET /api/v1/plugins/{plugin_id}/dokku/status`

- 摘要：Read live Dokku status for every bound runtime resource
- Operation ID：`plugin-control-plane-read_dokku_status`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginRuntimeStatusPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `502` | Dokku runtime failed. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 275. `POST /api/v1/plugins/{plugin_id}/enable`

- 摘要：Enable or restore one plugin installation
- Operation ID：`plugin-control-plane-enable_plugin`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `409` | Operation conflicts. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 276. `POST /api/v1/plugins/{plugin_id}/install`

- 摘要：Install a registered plugin for one organization
- Operation ID：`plugin-control-plane-install_plugin`
- 说明：Creates or resumes a tenant installation, stores configuration and encrypted secrets, and queues the durable installation workflow. Managed resources are deployed by the platform; external resources are health-checked and routed only. If runtime_app_name is omitted, the platform atomically selects the next available instance namespace instead of requiring a manual -v2 suffix.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginInstallRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginInstallationOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin, version, or organization was not found. |  |
| `409` | The plugin is installed or another operation is active. |  |
| `422` | Manifest, configuration, or secret validation failed. |  |

---

#### 277. `POST /api/v1/plugins/{plugin_id}/install-preflight`

- 摘要：Preflight a tenant plugin installation without changing state
- Operation ID：`plugin-control-plane-preflight_plugin_install`
- 说明：Checks tenant authorization, organization and version availability, manifest configuration, runtime readiness, installation conflicts, and all generated runtime resource names before an install job is queued. When no runtime name is supplied, the response includes the next available platform-generated name.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginInstallRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginInstallPreflightPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin, organization, or version was not found. |  |
| `422` | Configuration or secret validation failed. |  |

---

#### 278. `GET /api/v1/plugins/{plugin_id}/installations/{installation_id}`

- 摘要：Read one tenant plugin installation
- Operation ID：`plugin-control-plane-read_plugin_installation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginInstallationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 279. `GET /api/v1/plugins/{plugin_id}/logs`

- 摘要：Read bounded logs from one plugin app resource
- Operation ID：`plugin-control-plane-read_plugin_logs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |
| `resource_name` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `lines` | `query` | 否 | `integer` | default=200; minimum=1; maximum=1000 |  | 200 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginLogsPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation or app resource not found. |  |
| `502` | Dokku runtime failed. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 280. `GET /api/v1/plugins/{plugin_id}/permissions`

- 摘要：List permission scopes declared by a plugin manifest
- Operation ID：`plugin-control-plane-list_plugin_permissions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginPermissionsPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 281. `GET /api/v1/plugins/{plugin_id}/permissions/roles/{role_id}`

- 摘要：Read plugin scopes granted to one role
- Operation ID：`plugin-control-plane-read_role_plugin_permissions`
- 说明：Returns the exact global or organization-specific plugin scope assignment for a role. Global and organization grants are intentionally not merged.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `role_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginRolePermissionPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin, role, or organization not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 282. `PUT /api/v1/plugins/{plugin_id}/permissions/roles/{role_id}`

- 摘要：Replace plugin scopes granted to one role
- Operation ID：`plugin-control-plane-update_role_plugin_permissions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `role_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginRolePermissionUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginRolePermissionPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin, role, or organization not found. |  |
| `422` | Permission code is invalid. |  |

---

#### 283. `POST /api/v1/plugins/{plugin_id}/restart`

- 摘要：Restart all app resources for one plugin installation
- Operation ID：`plugin-control-plane-restart_plugin`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `409` | Operation conflicts. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 284. `POST /api/v1/plugins/{plugin_id}/rollback`

- 摘要：Roll back one plugin installation to its previous version
- Operation ID：`plugin-control-plane-rollback_plugin`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `409` | No rollback version or operation conflict. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 285. `GET /api/v1/plugins/{plugin_id}/routes`

- 摘要：List generated gateway routes for one plugin installation
- Operation ID：`plugin-control-plane-list_plugin_routes`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginRoutesPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 286. `GET /api/v1/plugins/{plugin_id}/runtime-resources`

- 摘要：List Dokku apps and services bound to one plugin installation
- Operation ID：`plugin-control-plane-list_runtime_resources`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginRuntimeResourcesPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 287. `GET /api/v1/plugins/{plugin_id}/services`

- 摘要：List registered services for one plugin installation
- Operation ID：`plugin-control-plane-list_plugin_services`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginServicesPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 288. `POST /api/v1/plugins/{plugin_id}/services/health-check`

- 摘要：Run HTTP health and OpenAPI checks for registered services
- Operation ID：`plugin-control-plane-health_check_plugin_services`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginHealthCheckPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `502` | One or more services are unhealthy. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 289. `POST /api/v1/plugins/{plugin_id}/services/register`

- 摘要：Register or replace one resolved plugin service
- Operation ID：`plugin-control-plane-register_plugin_service`
- 说明：Administrative control-plane endpoint; it is not available to plugins or normal users.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginServiceRegistrationCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `PluginServicePublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation or resource not found. |  |
| `422` | Service URL or route is invalid. |  |

---

#### 290. `POST /api/v1/plugins/{plugin_id}/uninstall-hard`

- 摘要：Permanently destroy a plugin after confirmation and backup acknowledgement
- Operation ID：`plugin-control-plane-hard_uninstall_plugin`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginHardUninstallRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `400` | Instance confirmation does not match. |  |
| `404` | Installation not found. |  |
| `409` | Policy, backup, or active operation prevents removal. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 291. `POST /api/v1/plugins/{plugin_id}/uninstall-soft`

- 摘要：Soft-uninstall a plugin and retain data and configuration
- Operation ID：`plugin-control-plane-soft_uninstall_plugin`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation not found. |  |
| `409` | Operation conflicts. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 292. `POST /api/v1/plugins/{plugin_id}/upgrade`

- 摘要：Upgrade one plugin installation with automatic rollback
- Operation ID：`plugin-control-plane-upgrade_plugin`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginUpgradeRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginOperationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation or target version not found. |  |
| `409` | Operation conflicts. |  |
| `422` | Target version is invalid. |  |

---

#### 293. `POST /api/v1/plugins/{plugin_id}/verify`

- 摘要：Verify stored manifests and immutable delivery references
- Operation ID：`plugin-control-plane-verify_plugin`
- 说明：Performs deterministic control-plane verification. External signature and vulnerability scanners are not reported as successful unless separately configured.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `installation_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginVerificationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin or installation not found. |  |
| `422` | Stored manifest or delivery reference is invalid. |  |

---

### Tag：plugin-internal-callbacks

#### 294. `POST /api/v1/plugins/internal/events`

- 摘要：Accept an authenticated event from one plugin instance
- Operation ID：`plugin-internal-callbacks-receive_plugin_event`
- 说明：Uses the per-installation callback token injected through Dokku config. The token and plugin secrets are never returned by platform APIs.
- 鉴权：`HTTPBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `PluginCallbackEventCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `202` | Successful Response | `application/json`: `PluginCallbackEventPublic` |
| `401` | Callback token is missing or invalid. |  |
| `404` | Plugin instance not found. |  |
| `409` | Plugin instance is purged. |  |
| `422` | Event or billing declaration is invalid. |  |
| `503` | Plugin center is disabled. |  |

---

### Tag：plugin-runtime

#### 295. `GET /api/v1/plugins/runtime/health`

- 摘要：检查插件运行器健康状态
- Operation ID：`plugin-runtime-runtime_health`
- 说明：仅超级管理员可访问。功能开关关闭时返回 disabled；开启后由平台调用 plugin-runtime 的公开进程健康检查。
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginRuntimeProxyResponse` |
| `401` | 未登录。 |  |
| `403` | 当前用户不是超级管理员。 |  |
| `502` | 运行器返回异常或不可达。 |  |
| `504` | 运行器调用超时。 |  |

---

#### 296. `GET /api/v1/plugins/runtime/info`

- 摘要：查询插件运行器连接信息
- Operation ID：`plugin-runtime-runtime_info`
- 说明：仅超级管理员可访问。返回运行模式与非敏感 Dokku 连接信息，不返回令牌或 SSH 密钥。
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginRuntimeProxyResponse` |
| `401` | 未登录。 |  |
| `403` | 当前用户不是超级管理员。 |  |
| `502` | 运行器返回异常或不可达。 |  |
| `503` | 插件中心配置不完整。 |  |
| `504` | 运行器调用超时。 |  |

---

### Tag：plugin-workflow-publications

#### 297. `GET /api/v1/plugins/catalog`

- 摘要：List enabled platform applications from plugin installations
- Operation ID：`plugin-workflow-publications-list_plugin_catalog`
- 说明：Returns container, built-in, and platform_workflow plugins through one catalog. Favorites are user-specific and do not change installation state.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `favorites_only` | `query` | 否 | `boolean` | default=False |  | False |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginCatalogPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 298. `POST /api/v1/plugins/catalog/{installation_id}/favorite`

- 摘要：Add one enabled plugin application to the current user's shortcuts
- Operation ID：`plugin-workflow-publications-add_plugin_favorite`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `installation_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginCatalogItemPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Installation is not available. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 299. `DELETE /api/v1/plugins/catalog/{installation_id}/favorite`

- 摘要：Remove one plugin application from the current user's shortcuts
- Operation ID：`plugin-workflow-publications-remove_plugin_favorite`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `installation_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 300. `GET /api/v1/plugins/internal/workflow-publications`

- 摘要：List Workflow-to-plugin publication jobs and mappings
- Operation ID：`plugin-workflow-publications-list_workflow_plugin_publications`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(`WorkflowPublicationStatus`, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationsPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 301. `POST /api/v1/plugins/internal/workflow-publications`

- 摘要：Publish an immutable Workflow version as a native platform plugin
- Operation ID：`plugin-workflow-publications-publish_workflow_plugin`
- 说明：Creates an idempotent platform_workflow plugin definition, immutable plugin version, enabled organization installation, and API/UI/Health/OpenAPI services, permissions, menus, and routes. Native Workflow publications use the shared Workflow Service runtime and never invoke Dokku.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `WorkflowPluginPublicationCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Organization not found. |  |
| `409` | Idempotency, version, or lifecycle conflict. |  |
| `422` | Workflow publication payload is invalid. |  |

---

#### 302. `GET /api/v1/plugins/internal/workflow-publications/{workflow_version_id}`

- 摘要：Read one Workflow plugin publication mapping and status
- Operation ID：`plugin-workflow-publications-read_workflow_plugin_publication`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_version_id` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Publication not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 303. `POST /api/v1/plugins/internal/workflow-publications/{workflow_version_id}/archive`

- 摘要：Archive a Workflow plugin and remove it from the application catalog
- Operation ID：`plugin-workflow-publications-archive_workflow_plugin_publication`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_version_id` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Publication not found. |  |
| `409` | Publication has no installation. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 304. `POST /api/v1/plugins/internal/workflow-publications/{workflow_version_id}/disable`

- 摘要：Disable a Workflow plugin installation, services, menu, and routes
- Operation ID：`plugin-workflow-publications-disable_workflow_plugin_publication`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_version_id` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Publication not found. |  |
| `409` | Publication has no installation. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 305. `POST /api/v1/plugins/internal/workflow-publications/{workflow_version_id}/enable`

- 摘要：Re-enable a disabled Workflow plugin publication
- Operation ID：`plugin-workflow-publications-enable_workflow_plugin_publication`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_version_id` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Publication not found. |  |
| `409` | Publication cannot be enabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 306. `POST /api/v1/plugins/internal/workflow-publications/{workflow_version_id}/retry`

- 摘要：Retry a failed Workflow plugin publication with its original idempotency key
- Operation ID：`plugin-workflow-publications-retry_workflow_plugin_publication`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_version_id` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Publication not found. |  |
| `409` | Publication state does not allow retry. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 307. `POST /api/v1/plugins/internal/workflow-publications/{workflow_version_id}/rollback`

- 摘要：Roll a Workflow plugin installation back to a previously published version
- Operation ID：`plugin-workflow-publications-rollback_workflow_plugin_publication`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_version_id` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `WorkflowPluginRollbackRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Current or target publication not found. |  |
| `409` | Target belongs to another Workflow or is incomplete. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 308. `PUT /api/v1/plugins/internal/workflow-publications/{workflow_version_id}/runtime-binding`

- 摘要：Bind one prepared Workflow runtime release to a disabled publication
- Operation ID：`plugin-workflow-publications-bind_workflow_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_version_id` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `WorkflowRuntimeBindingCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowPluginPublicationPublic` |
| `401` | Internal service token is missing or invalid. |  |
| `409` | Release or publication state conflicts with the existing binding. |  |
| `422` | Runtime binding payload is invalid. |  |

---

#### 309. `GET /api/v1/plugins/workflow-runtime/apps/{workflow_app_id}`

- 摘要：Load a published native Workflow application's conversation configuration
- Operation ID：`plugin-workflow-publications-read_workflow_runtime_config`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_app_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowRuntimeConfigPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Published Workflow plugin not found. |  |
| `502` | Workflow Service returned an invalid response. |  |
| `504` | Workflow Service request timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 310. `GET /api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/conversations`

- 摘要：List persisted conversations from the active Workflow Runtime
- Operation ID：`plugin-workflow-publications-list_workflow_runtime_conversations`
- 说明：Returns only conversations owned by the authenticated tenant and user. History is stored in the Workflow application's stable runtime volume.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_app_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowRuntimeConversationListPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Workflow Runtime binding is unavailable or unhealthy. |  |
| `404` | Published Workflow plugin not found. |  |
| `502` | Workflow Runtime returned an invalid response. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 311. `DELETE /api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/conversations/{conversation_id}`

- 摘要：Delete one persisted Workflow Runtime conversation
- Operation ID：`plugin-workflow-publications-delete_workflow_runtime_conversation`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_app_id` | `path` | 是 | `string` |  |  |  |
| `conversation_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Workflow Runtime binding is unavailable or unhealthy. |  |
| `404` | Conversation or published Workflow plugin not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 312. `GET /api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/conversations/{conversation_id}/messages`

- 摘要：Read messages from one persisted Workflow Runtime conversation
- Operation ID：`plugin-workflow-publications-list_workflow_runtime_conversation_messages`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_app_id` | `path` | 是 | `string` |  |  |  |
| `conversation_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowRuntimeConversationMessagesPublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Workflow Runtime binding is unavailable or unhealthy. |  |
| `404` | Conversation or published Workflow plugin not found. |  |
| `502` | Workflow Runtime returned an invalid response. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 313. `POST /api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/messages`

- 摘要：Run one message through the native Workflow runtime adapter
- Operation ID：`plugin-workflow-publications-send_workflow_runtime_message`
- 说明：Executes the published app through the shared Workflow Service and returns the completed answer, optional normalized navigation cards and structured artifacts, pending interactions, and the conversation ID.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_app_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `WorkflowRuntimeMessageCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkflowRuntimeMessagePublic` |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Published Workflow plugin not found. |  |
| `422` | Message is invalid. |  |
| `502` | Workflow execution or upstream response failed. |  |
| `504` | Workflow execution timed out. |  |

---

#### 314. `POST /api/v1/plugins/workflow-runtime/apps/{workflow_app_id}/messages/stream`

- 摘要：Stream one message through the active Workflow Runtime workbench
- Operation ID：`plugin-workflow-publications-stream_workflow_runtime_message`
- 说明：Streams meta, progress, zero or more token/citation events, optional usage, answer, optional cards, optional artifacts, optional interaction, and done SSE events from the runtime container. A cards event uses the ff-ai.cards.v1 payload. An artifacts event uses the versioned structured-content payload. Structured output and interaction appear only after answer and before done. Failed executions may emit error before done. The first message creates the persisted conversation.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `workflow_app_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `WorkflowRuntimeMessageCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Workflow SSE stream; cards, artifacts, and interaction follow answer and precede done when present. | `application/json`: object |
| `401` | Not authenticated. |  |
| `403` | Plugin or organization permission denied. |  |
| `503` | Workflow Runtime binding is unavailable or unhealthy. |  |
| `404` | Published Workflow plugin not found. |  |
| `429` | Workflow Runtime rate limit or provider quota exceeded. |  |
| `422` | Message is invalid. |  |
| `502` | Workflow Runtime is unavailable or execution failed. |  |
| `504` | Workflow Runtime request timed out. |  |

---

#### 315. `GET /api/v1/plugins/workflow-runtime/health`

- 摘要：Check the native Workflow plugin adapter
- Operation ID：`plugin-workflow-publications-workflow_runtime_health`
- 说明：Checks connectivity to the shared Workflow Service runtime.
- 鉴权：`未声明`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `503` | Workflow Service is not configured or unavailable. |  |

---

### Tag：plugins

#### 316. `GET /api/v1/plugins`

- 摘要：List registered plugin definitions
- Operation ID：`plugins-list_plugin_definitions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginDefinitionsPublic` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 317. `POST /api/v1/plugins`

- 摘要：Register a plugin definition and its first version
- Operation ID：`plugins-create_plugin_registration`
- 说明：Registers a validated ff-plugin manifest and its delivery references. A plugin may declare one managed image or multiple managed/external runtime resources. This stage records metadata only and does not deploy or control external resources.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `PluginRegistrationCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `PluginDefinitionDetail` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `409` | The plugin definition already exists. |  |
| `422` | The manifest or delivery references are invalid. |  |

---

#### 318. `POST /api/v1/plugins/import-compose`

- 摘要：Upload Docker Compose and register a plugin from actual runtime
- Operation ID：`plugins-import_plugin_from_compose`
- 说明：Accepts one UTF-8 .yml or .yaml file up to 1 MiB and matches its services to currently running Docker Compose containers. Container labels, image IDs, published ports, state, health and HTTP/OpenAPI probes are read from the actual Docker runtime before atomic registration. No runtime value is taken from a Compose port or image guess. Environment values, env files, and secrets are ignored and never returned. All imported resources are external-managed; this endpoint does not create, update, or delete containers. When several HTML services are verified, a unique direct or transitive Compose dependency on the verified OpenAPI service identifies the business UI. Detection failures return structured reasons with service, container, state, health and resolution.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`multipart/form-data`: `Body_plugins-import_plugin_from_compose`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ComposePluginRegistrationPublic` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | The Docker runtime inspection API is unavailable. | `application/json`: `ComposeImportErrorResponse` |
| `400` | The file name or UTF-8 encoding is invalid. |  |
| `409` | Runtime project is missing, ambiguous, incomplete, unhealthy, or its UI/API endpoints cannot be uniquely verified. | `application/json`: `ComposeImportErrorResponse` |
| `413` | The uploaded Compose file exceeds 1 MiB. |  |
| `422` | The uploaded file is not valid Docker Compose YAML. |  |

---

#### 319. `POST /api/v1/plugins/manifest-drafts/from-compose`

- 摘要：Generate a plugin Manifest draft from Docker Compose
- Operation ID：`plugins-create_manifest_draft_from_compose`
- 说明：Safely parses at most 1 MiB of Docker Compose YAML and generates an external-resource Manifest draft. Only service names, image/build declarations, ports, and dependencies are read. Environment values, env files, passwords, and Compose secrets are never returned. This endpoint does not access Docker or change containers.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `ComposeManifestDraftRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ComposeManifestDraftResponse` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `422` | Compose YAML or plugin metadata is invalid. |  |

---

#### 320. `POST /api/v1/plugins/manifest-drafts/validate`

- 摘要：Validate a plugin Manifest draft
- Operation ID：`plugins-validate_manifest_draft`
- 说明：Validates the complete ff-plugin Manifest contract without registering a plugin, accessing Docker, or changing persistent state.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `PluginManifestValidationRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Validation result, including structured field errors. | `application/json`: `PluginManifestValidationResponse` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `422` | The request body does not contain a Manifest object. |  |

---

#### 321. `GET /api/v1/plugins/{plugin_id}`

- 摘要：Read one plugin definition and all registered versions
- Operation ID：`plugins-read_plugin_definition`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginDefinitionDetail` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin definition not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 322. `PATCH /api/v1/plugins/{plugin_id}`

- 摘要：Update plugin display metadata
- Operation ID：`plugins-update_plugin_definition`
- 说明：Updates the plugin display name and/or description. The stable plugin ID and immutable version manifests are not changed.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginDefinitionUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginDefinitionDetail` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin definition not found. |  |
| `422` | No metadata field was supplied or a field is invalid. |  |

---

#### 323. `DELETE /api/v1/plugins/{plugin_id}`

- 摘要：Delete an unused plugin definition
- Operation ID：`plugins-delete_plugin_definition`
- 说明：Soft-deletes a non-official, non-Workflow plugin after every installation is uninstalled. Historical versions, installations, and audit evidence are retained.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginDefinitionDeletePublic` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin definition not found. |  |
| `409` | The plugin is official/Workflow-managed or still has active installations. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 324. `GET /api/v1/plugins/{plugin_id}/installations`

- 摘要：List tenant installation records for one plugin
- Operation ID：`plugins-list_plugin_installations`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginInstallationsPublic` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin definition not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 325. `POST /api/v1/plugins/{plugin_id}/installations`

- 摘要：Record a tenant plugin installation
- Operation ID：`plugins-create_plugin_installation`
- 说明：Records that an organization uses a registered plugin version and reserves a managed Dokku app name without deploying it. Use POST /plugins/{plugin_id}/install to execute the durable Dokku installation workflow.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginInstallationCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `PluginInstallationPublic` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin, version, or organization not found. |  |
| `409` | The installation or runtime app name already exists. |  |
| `422` | The installation request is invalid. |  |

---

#### 326. `GET /api/v1/plugins/{plugin_id}/versions`

- 摘要：List registered versions for one plugin
- Operation ID：`plugins-list_plugin_versions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PluginVersionsPublic` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `404` | Plugin definition not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 327. `POST /api/v1/plugins/{plugin_id}/versions`

- 摘要：Register another immutable plugin version
- Operation ID：`plugins-create_plugin_version`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `plugin_id` | `path` | 是 | `string` | pattern=^[a-z][a-z0-9-]{1,31}$ |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PluginVersionCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `PluginVersionPublic` |
| `401` | Not authenticated. |  |
| `403` | Superuser privileges are required. |  |
| `503` | Plugin center is disabled. |  |
| `400` | Manifest plugin ID does not match the definition. |  |
| `404` | Plugin definition not found. |  |
| `409` | Plugin version already exists. |  |
| `422` | The manifest or delivery references are invalid. |  |

---

### Tag：ppt-master

#### 328. `GET /api/v1/tools/ppt-master/health`

- 摘要：Check PPT Master service health
- Operation ID：`ppt-master-health`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `503` | PPT Master is not configured or unavailable. |  |

---

#### 329. `POST /api/v1/tools/ppt-master/jobs`

- 摘要：Create a PPT Master job
- Operation ID：`ppt-master-create_job`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `PptMasterCreateJobRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PptMasterJobPublic` |
| `503` | PPT Master is not configured or unavailable. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 330. `GET /api/v1/tools/ppt-master/jobs/{job_id}`

- 摘要：Get a PPT Master job
- Operation ID：`ppt-master-get_job`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PptMasterJobPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 331. `GET /api/v1/tools/ppt-master/jobs/{job_id}/artifacts/{artifact_path}`

- 摘要：Download a PPT Master artifact
- Operation ID：`ppt-master-download_artifact`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string` |  |  |  |
| `artifact_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Binary artifact content, such as an exported PPTX file. | `application/json`: object<br>`application/octet-stream`: object |
| `502` | PPT Master returned an error. |  |
| `503` | PPT Master is not configured. |  |
| `504` | PPT Master timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 332. `POST /api/v1/tools/ppt-master/jobs/{job_id}/export`

- 摘要：Export PPT Master SVG slides to PPTX
- Operation ID：`ppt-master-export_pptx`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PptMasterExportRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PptMasterJobPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 333. `POST /api/v1/tools/ppt-master/jobs/{job_id}/slides/svg`

- 摘要：Add an SVG slide to a PPT Master job
- Operation ID：`ppt-master-add_svg_slide`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PptMasterSvgSlideRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PptMasterJobPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 334. `POST /api/v1/tools/ppt-master/jobs/{job_id}/sources/markdown`

- 摘要：Add a Markdown source file to a PPT Master job
- Operation ID：`ppt-master-add_markdown_source`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `PptMasterMarkdownSourceRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PptMasterJobPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：production-approval

#### 335. `POST /api/v1/admin/production/agents/{agent_id}/rollback`

- 摘要：Rollback Production Agent
- Operation ID：`production-approval-rollback_production_agent`
- 说明：撤回 production 状态的 Agent。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ProductionRollbackCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionRollbackPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 336. `GET /api/v1/admin/production/approvals`

- 摘要：List Production Approvals
- Operation ID：`production-approval-list_production_approvals`
- 说明：列出生产发布审批申请。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `agent_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `target_type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=1; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 337. `POST /api/v1/admin/production/approvals`

- 摘要：Create Production Approval
- Operation ID：`production-approval-create_production_approval`
- 说明：提交生产发布审批申请。<br><br>支持两种调用方：<br>1. 前台用户：需拥有 `admin.production.request` 权限， `current_user` 即发起人。<br>2. 内部服务（Monorepo 等）：需提供 `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`，<br>   实际发起人从 payload.requester_id 读取（如未提供则回退为 system user）。<br><br>自动绑定：<br>- 最近一次 QA 测试结果（来自 deployment.qa_result 快照）<br>- 一次 GRC 评估（创建新评估或接受幂等命中）<br>- 组织级默认审批人（未传 approver_* 时回退到 tenant_admin）
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ProductionApprovalCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 338. `GET /api/v1/admin/production/approvals/{approval_id}`

- 摘要：Get Production Approval
- Operation ID：`production-approval-get_production_approval`
- 说明：获取审批详情（含 QA 快照、审批人、决定列表）。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `approval_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 339. `POST /api/v1/admin/production/approvals/{approval_id}/apply`

- 摘要：Apply Production Approval
- Operation ID：`production-approval-apply_production_approval`
- 说明：异步重试上线生效。<br><br>用于审批通过后异步激活失败的补偿场景。接口只重置状态并投递任务，<br>不等待 Runtime 启动、探活或插件登记完成。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `approval_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 340. `POST /api/v1/admin/production/approvals/{approval_id}/cancel`

- 摘要：Cancel Production Approval
- Operation ID：`production-approval-cancel_production_approval`
- 说明：取消生产审批（仅 requester）。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `approval_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ProductionApprovalCancel`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 341. `POST /api/v1/admin/production/approvals/{approval_id}/decisions`

- 摘要：Submit Production Decision
- Operation ID：`production-approval-submit_production_decision`
- 说明：提交生产审批决定（APPROVED / REJECTED）。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `approval_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ProductionApprovalDecisionCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 342. `POST /api/v1/admin/production/approvals/{approval_id}/runtime/refresh`

- 摘要：Refresh Runtime Status
- Operation ID：`production-approval-refresh_runtime_status`
- 说明：刷新运行实例的实时容器状态。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `approval_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 343. `POST /api/v1/admin/production/approvals/{approval_id}/runtime/restart`

- 摘要：Restart Runtime Container
- Operation ID：`production-approval-restart_runtime_container`
- 说明：重启运行实例容器并更新关联状态。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `approval_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 344. `POST /api/v1/admin/production/approvals/{approval_id}/runtime/stop`

- 摘要：Stop Runtime Container
- Operation ID：`production-approval-stop_runtime_container`
- 说明：停止运行实例容器并更新关联状态。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `approval_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ProductionApprovalDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：question-generation

#### 345. `GET /api/v1/question-generation/jobs`

- 摘要：List question-generation jobs
- Operation ID：`question-generation-list_question_generation_jobs`
- 说明：Lists the current user's question-generation jobs. Superusers can set all_users=true to inspect all jobs.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string (pending, generating, generated, syncing, synced, failed), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=1; maximum=100 |  | 20 |
| `all_users` | `query` | 否 | `boolean` | default=False |  | False |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `QuestionGenerationJobsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 346. `POST /api/v1/question-generation/jobs`

- 摘要：Generate questions and optionally backfill an existing exam paper
- Operation ID：`question-generation-create_question_generation_job`
- 说明：Creates a platform question-generation job, calls the configured AI generation service, validates the result, and by default syncs it to ff-exam-api's POST /api/v1/agent/exams backfill endpoint. When sync_to_exam=true, the request must include paper_id for an exam paper that admin-web already created. The downstream payload is paperId + questions; this endpoint no longer asks the Exam API to create the paper. Phase one requires a platform superuser because the downstream Exam API currently expects an administrator-level Bearer token.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `QuestionGenerationJobCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `QuestionGenerationJobDetail` |
| `401` | Missing or invalid platform token. |  |
| `403` | Current user cannot create exam papers. |  |
| `422` | Invalid request or AI output schema. |  |
| `502` | AI service or Exam API failed. |  |
| `503` | Required downstream service is not configured. |  |
| `504` | Downstream service timed out. |  |

---

#### 347. `GET /api/v1/question-generation/jobs/{job_id}`

- 摘要：Get a question-generation job
- Operation ID：`question-generation-get_question_generation_job`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `QuestionGenerationJobDetail` |
| `404` | Job not found. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 348. `POST /api/v1/question-generation/jobs/{job_id}/sync-to-exam`

- 摘要：Retry syncing a generated job to the Exam API
- Operation ID：`question-generation-sync_question_generation_job_to_exam`
- 说明：Retries POST /api/v1/agent/exams with the stored exam_payload. The current platform Bearer token is forwarded to ff-exam-api.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `job_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `QuestionGenerationJobPublic` |
| `403` | Current user cannot create exam papers. |  |
| `404` | Job not found. |  |
| `409` | Job has no exam payload ready to sync. |  |
| `422` | The downstream Exam API rejected the stored payload. |  |
| `502` | The Exam API failed. |  |
| `503` | Exam API is not configured. |  |
| `504` | Exam API timed out. |  |

---

### Tag：rbac

#### 349. `GET /api/v1/admin/menus`

- 摘要：Read Admin Menus
- Operation ID：`rbac-read_admin_menus`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `app` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`MenuPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 350. `GET /api/v1/admin/organizations`

- 摘要：Read Admin Organizations
- Operation ID：`rbac-read_admin_organizations`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=1; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `OrganizationsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 351. `POST /api/v1/admin/organizations`

- 摘要：Create Admin Organization
- Operation ID：`rbac-create_admin_organization`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `OrganizationCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `OrganizationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 352. `GET /api/v1/admin/organizations/tree`

- 摘要：Read Admin Organization Tree
- Operation ID：`rbac-read_admin_organization_tree`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`OrganizationPublic`> |

---

#### 353. `PATCH /api/v1/admin/organizations/{organization_id}`

- 摘要：Update Admin Organization
- Operation ID：`rbac-update_admin_organization`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `OrganizationUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `OrganizationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 354. `DELETE /api/v1/admin/organizations/{organization_id}`

- 摘要：Delete Admin Organization
- Operation ID：`rbac-delete_admin_organization`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 355. `GET /api/v1/admin/permissions`

- 摘要：Read Admin Permissions
- Operation ID：`rbac-read_admin_permissions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `group` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `resource` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `is_menu` | `query` | 否 | `anyOf(boolean, null)` |  |  |  |
| `is_api` | `query` | 否 | `anyOf(boolean, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=200; minimum=1; maximum=500 |  | 200 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PermissionsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 356. `GET /api/v1/admin/roles`

- 摘要：Read Admin Roles
- Operation ID：`rbac-read_admin_roles`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `scope_type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RolesPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 357. `POST /api/v1/admin/roles`

- 摘要：Create Admin Role
- Operation ID：`rbac-create_admin_role`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `RoleCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RolePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 358. `GET /api/v1/admin/roles/{role_id}`

- 摘要：Read Admin Role
- Operation ID：`rbac-read_admin_role`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `role_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RoleDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 359. `PATCH /api/v1/admin/roles/{role_id}`

- 摘要：Update Admin Role
- Operation ID：`rbac-update_admin_role`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `role_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `RoleUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RolePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 360. `DELETE /api/v1/admin/roles/{role_id}`

- 摘要：Delete Admin Role
- Operation ID：`rbac-delete_admin_role`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `role_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 361. `PUT /api/v1/admin/roles/{role_id}/permissions`

- 摘要：Update Admin Role Permissions
- Operation ID：`rbac-update_admin_role_permissions`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `role_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `RolePermissionsUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RoleDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 362. `GET /api/v1/admin/users/assignable-tenants`

- 摘要：List Assignable Tenants
- Operation ID：`rbac-list_assignable_tenants`
- 说明：Return tenants that the current user may assign new users to.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`AssignableTenant`> |

---

#### 363. `GET /api/v1/admin/users/{user_id}/organizations`

- 摘要：Get User Organizations
- Operation ID：`rbac-get_user_organizations`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`CurrentOrganizationPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 364. `PUT /api/v1/admin/users/{user_id}/organizations`

- 摘要：Update User Organizations
- Operation ID：`rbac-update_user_organizations`
- 说明：Replace the user's memberships. Exactly one primary tenant is<br>allowed; the migration pipeline routes role assignments through<br>``change_user_tenant`` so cross-tenant authority cannot leak.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `UserOrganizationsUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`CurrentOrganizationPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 365. `GET /api/v1/admin/users/{user_id}/roles`

- 摘要：Read Admin User Roles
- Operation ID：`rbac-read_admin_user_roles`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`UserRoleAssignment`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 366. `PUT /api/v1/admin/users/{user_id}/roles`

- 摘要：Update Admin User Roles
- Operation ID：`rbac-update_admin_user_roles`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `UserRolesUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`UserRoleAssignment`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 367. `GET /api/v1/menus/me`

- 摘要：Read Current Menus
- Operation ID：`rbac-read_current_menus`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `app` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`MenuPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 368. `GET /api/v1/rbac/me`

- 摘要：Read Current Rbac Profile
- Operation ID：`rbac-read_current_rbac_profile`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `CurrentRbacProfile` |

---

### Tag：redis

#### 369. `GET /api/v1/redis/health/`

- 摘要：Redis Health Check
- Operation ID：`redis-redis_health_check`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |

---

#### 370. `GET /api/v1/redis/keys/`

- 摘要：List Redis Keys
- Operation ID：`redis-list_redis_keys`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `match` | `query` | 否 | `string` | default=* | Redis key pattern, for example user:* | * |
| `limit` | `query` | 否 | `integer` | default=100; minimum=0; maximum=1000 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RedisKeysPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 371. `POST /api/v1/redis/keys/`

- 摘要：Create Redis Key
- Operation ID：`redis-create_redis_key`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `RedisKeyCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `RedisKeyPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 372. `GET /api/v1/redis/keys/{key}`

- 摘要：Read Redis Key
- Operation ID：`redis-read_redis_key`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `key` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RedisKeyPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 373. `PUT /api/v1/redis/keys/{key}`

- 摘要：Update Redis Key
- Operation ID：`redis-update_redis_key`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `key` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `RedisKeyUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `RedisKeyPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 374. `DELETE /api/v1/redis/keys/{key}`

- 摘要：Delete Redis Key
- Operation ID：`redis-delete_redis_key`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `key` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：runtime-proxy

#### 375. `GET /runtime/{runtime_path}`

- 摘要：Proxy Docker runtime deployment requests
- Operation ID：`runtime-proxy-proxy_docker_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 376. `POST /runtime/{runtime_path}`

- 摘要：Proxy Docker runtime deployment requests
- Operation ID：`runtime-proxy-proxy_docker_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 377. `PUT /runtime/{runtime_path}`

- 摘要：Proxy Docker runtime deployment requests
- Operation ID：`runtime-proxy-proxy_docker_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 378. `PATCH /runtime/{runtime_path}`

- 摘要：Proxy Docker runtime deployment requests
- Operation ID：`runtime-proxy-proxy_docker_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 379. `DELETE /runtime/{runtime_path}`

- 摘要：Proxy Docker runtime deployment requests
- Operation ID：`runtime-proxy-proxy_docker_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 380. `OPTIONS /runtime/{runtime_path}`

- 摘要：Proxy Docker runtime deployment requests
- Operation ID：`runtime-proxy-proxy_docker_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 381. `HEAD /runtime/{runtime_path}`

- 摘要：Proxy Docker runtime deployment requests
- Operation ID：`runtime-proxy-proxy_docker_runtime`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：service-catalog

#### 382. `GET /api/v1/admin/service-catalog/categories`

- 摘要：List Categories
- Operation ID：`service-catalog-list_categories`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`ServiceCategoryPublic`> |

---

#### 383. `POST /api/v1/admin/service-catalog/categories`

- 摘要：Create Category
- Operation ID：`service-catalog-create_category`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceCategoryCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ServiceCategoryPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 384. `PATCH /api/v1/admin/service-catalog/categories/{category_id}`

- 摘要：Update Category
- Operation ID：`service-catalog-update_category`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `category_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceCategoryUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ServiceCategoryPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 385. `DELETE /api/v1/admin/service-catalog/categories/{category_id}`

- 摘要：Delete Category
- Operation ID：`service-catalog-delete_category`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `category_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 386. `GET /api/v1/admin/service-catalog/export`

- 摘要：Export Workbook
- Operation ID：`service-catalog-export_workbook`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `template` | `query` | 否 | `integer` | default=0 |  | 0 |
| `category_id` | `query` | 否 | `anyOf(array<string (uuid)>, null)` |  |  |  |
| `service_id` | `query` | 否 | `anyOf(array<string (uuid)>, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 387. `POST /api/v1/admin/service-catalog/import`

- 摘要：Import Workbook
- Operation ID：`service-catalog-import_workbook`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`multipart/form-data`: `Body_service-catalog-import_workbook`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 388. `GET /api/v1/admin/service-catalog/nodes/{node_id}/materials`

- 摘要：List Materials
- Operation ID：`service-catalog-list_materials`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `node_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`ServiceNodeMaterialPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 389. `POST /api/v1/admin/service-catalog/nodes/{node_id}/materials`

- 摘要：Create Material
- Operation ID：`service-catalog-create_material`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `node_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceNodeMaterialCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ServiceNodeMaterialPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 390. `PATCH /api/v1/admin/service-catalog/nodes/{node_id}/materials/{material_id}`

- 摘要：Update Material
- Operation ID：`service-catalog-update_material`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `node_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `material_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceNodeMaterialUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ServiceNodeMaterialPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 391. `DELETE /api/v1/admin/service-catalog/nodes/{node_id}/materials/{material_id}`

- 摘要：Delete Material
- Operation ID：`service-catalog-delete_material`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `node_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `material_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 392. `GET /api/v1/admin/service-catalog/services`

- 摘要：List Services
- Operation ID：`service-catalog-list_services`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `category_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `service_level` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 393. `POST /api/v1/admin/service-catalog/services`

- 摘要：Create Service
- Operation ID：`service-catalog-create_service`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceDefinitionCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ServiceDefinitionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 394. `GET /api/v1/admin/service-catalog/services/{service_id}`

- 摘要：Get Service
- Operation ID：`service-catalog-get_service`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ServiceDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 395. `PATCH /api/v1/admin/service-catalog/services/{service_id}`

- 摘要：Update Service
- Operation ID：`service-catalog-update_service`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceDefinitionUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ServiceDefinitionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 396. `DELETE /api/v1/admin/service-catalog/services/{service_id}`

- 摘要：Delete Service
- Operation ID：`service-catalog-delete_service`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 397. `GET /api/v1/admin/service-catalog/services/{service_id}/agent-links`

- 摘要：List Agent Links
- Operation ID：`service-catalog-list_agent_links`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`ServiceAgentLinkPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 398. `POST /api/v1/admin/service-catalog/services/{service_id}/agent-links`

- 摘要：Create Agent Link
- Operation ID：`service-catalog-create_agent_link`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceAgentLinkCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ServiceAgentLinkPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 399. `PATCH /api/v1/admin/service-catalog/services/{service_id}/agent-links/{link_id}`

- 摘要：Update Agent Link
- Operation ID：`service-catalog-update_agent_link`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `link_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceAgentLinkUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ServiceAgentLinkPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 400. `DELETE /api/v1/admin/service-catalog/services/{service_id}/agent-links/{link_id}`

- 摘要：Delete Agent Link
- Operation ID：`service-catalog-delete_agent_link`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `link_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 401. `GET /api/v1/admin/service-catalog/services/{service_id}/nodes`

- 摘要：List Nodes
- Operation ID：`service-catalog-list_nodes`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`ServiceProcessNodePublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 402. `POST /api/v1/admin/service-catalog/services/{service_id}/nodes`

- 摘要：Create Node
- Operation ID：`service-catalog-create_node`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceProcessNodeCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ServiceProcessNodePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 403. `PUT /api/v1/admin/service-catalog/services/{service_id}/nodes/reorder`

- 摘要：Reorder Nodes
- Operation ID：`service-catalog-reorder_nodes`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: array<string (uuid)>
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`ServiceProcessNodePublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 404. `PATCH /api/v1/admin/service-catalog/services/{service_id}/nodes/{node_id}`

- 摘要：Update Node
- Operation ID：`service-catalog-update_node`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `node_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceProcessNodeUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ServiceProcessNodePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 405. `DELETE /api/v1/admin/service-catalog/services/{service_id}/nodes/{node_id}`

- 摘要：Delete Node
- Operation ID：`service-catalog-delete_node`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `node_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 406. `GET /api/v1/admin/service-catalog/services/{service_id}/systems`

- 摘要：List Systems
- Operation ID：`service-catalog-list_systems`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`ServiceRelatedSystemPublic`> |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 407. `POST /api/v1/admin/service-catalog/services/{service_id}/systems`

- 摘要：Create System
- Operation ID：`service-catalog-create_system`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceRelatedSystemCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ServiceRelatedSystemPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 408. `PATCH /api/v1/admin/service-catalog/services/{service_id}/systems/{system_id}`

- 摘要：Update System
- Operation ID：`service-catalog-update_system`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `system_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ServiceRelatedSystemUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ServiceRelatedSystemPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 409. `DELETE /api/v1/admin/service-catalog/services/{service_id}/systems/{system_id}`

- 摘要：Delete System
- Operation ID：`service-catalog-delete_system`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `service_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `system_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：stage-switch

#### 410. `GET /api/v1/admin/stage-switch/audit-events`

- 摘要：List Audit Events
- Operation ID：`stage-switch-list_audit_events`
- 说明：List stage-switch audit events in the caller's organization.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `request_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `event_type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `actor_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchAuditEventListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 411. `GET /api/v1/admin/stage-switch/notifications`

- 摘要：List Notifications
- Operation ID：`stage-switch-list_notifications`
- 说明：List notifications for the current user.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchNotificationListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 412. `POST /api/v1/admin/stage-switch/notifications/read-all`

- 摘要：Mark All Notifications Read
- Operation ID：`stage-switch-mark_all_notifications_read`
- 说明：Mark all notifications as read for the current user.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchMarkAllReadPublic` |

---

#### 413. `GET /api/v1/admin/stage-switch/notifications/unread-count`

- 摘要：Unread Notification Count
- Operation ID：`stage-switch-unread_notification_count`
- 说明：Get unread notification count for the current user.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchUnreadCountPublic` |

---

#### 414. `POST /api/v1/admin/stage-switch/notifications/{notification_id}/read`

- 摘要：Mark Notification Read
- Operation ID：`stage-switch-mark_notification_read`
- 说明：Mark a single notification as read.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `notification_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchNotificationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 415. `GET /api/v1/admin/stage-switch/reports/overview`

- 摘要：Get Stage Switch Report Overview
- Operation ID：`stage-switch-get_stage_switch_report_overview`
- 说明：Return organization-scoped stage-switch SLA and outcome metrics.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `direction` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 416. `GET /api/v1/admin/stage-switch/requests`

- 摘要：List Requests
- Operation ID：`stage-switch-list_requests`
- 说明：List stage-switch requests scoped to the caller's organization.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `approval_status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `execution_status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `direction` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchRequestListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 417. `POST /api/v1/admin/stage-switch/requests`

- 摘要：Create Request
- Operation ID：`stage-switch-create_request`
- 说明：Create a stage-switch approval request.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `StageSwitchRequestCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `StageSwitchRequestPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 418. `GET /api/v1/admin/stage-switch/requests/{request_id}`

- 摘要：Get Request Detail
- Operation ID：`stage-switch-get_request_detail`
- 说明：Get full detail of a stage-switch request including nodes, assignees, and decisions.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `request_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 419. `POST /api/v1/admin/stage-switch/requests/{request_id}/cancel`

- 摘要：Cancel Request
- Operation ID：`stage-switch-cancel_request`
- 说明：Cancel a stage-switch request.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `request_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `StageSwitchRequestCancel`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchRequestPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 420. `POST /api/v1/admin/stage-switch/requests/{request_id}/decisions`

- 摘要：Submit Decision
- Operation ID：`stage-switch-submit_decision`
- 说明：Submit an approval/rejection decision for the current approval node.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `request_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `StageSwitchDecisionCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `StageSwitchDecisionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 421. `POST /api/v1/admin/stage-switch/requests/{request_id}/retry-execution`

- 摘要：Retry Execution
- Operation ID：`stage-switch-retry_execution`
- 说明：Retry a failed stage-switch execution.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `request_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `StageSwitchRetryExecution`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchRequestPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 422. `GET /api/v1/admin/stage-switch/tasks`

- 摘要：List My Tasks
- Operation ID：`stage-switch-list_my_tasks`
- 说明：List my pending stage-switch approval tasks.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=1; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 423. `GET /api/v1/admin/stage-switch/templates`

- 摘要：List Templates
- Operation ID：`stage-switch-list_templates`
- 说明：List stage-switch approval templates.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `direction` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=1; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchTemplateListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 424. `POST /api/v1/admin/stage-switch/templates`

- 摘要：Create Template
- Operation ID：`stage-switch-create_template`
- 说明：Create a new approval template draft with nodes.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `StageSwitchTemplateCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `StageSwitchTemplatePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 425. `GET /api/v1/admin/stage-switch/templates/{template_id}`

- 摘要：Get Template
- Operation ID：`stage-switch-get_template`
- 说明：Get stage-switch approval template detail including node definitions.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchTemplateDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 426. `PUT /api/v1/admin/stage-switch/templates/{template_id}`

- 摘要：Update Template
- Operation ID：`stage-switch-update_template`
- 说明：Update an existing template (only DRAFT status).
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `StageSwitchTemplateUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchTemplatePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 427. `POST /api/v1/admin/stage-switch/templates/{template_id}/clone`

- 摘要：Clone Template
- Operation ID：`stage-switch-clone_template`
- 说明：Clone an existing template as a new draft version.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `StageSwitchTemplatePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 428. `POST /api/v1/admin/stage-switch/templates/{template_id}/publish`

- 摘要：Publish Template
- Operation ID：`stage-switch-publish_template`
- 说明：Publish a template (draft -> published).
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchTemplatePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 429. `POST /api/v1/admin/stage-switch/templates/{template_id}/retire`

- 摘要：Retire Template
- Operation ID：`stage-switch-retire_template`
- 说明：Retire a published template (published -> retired).
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `StageSwitchTemplatePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 430. `POST /api/v1/admin/stage-switch/templates/{template_id}/validate`

- 摘要：Validate Template
- Operation ID：`stage-switch-validate_template`
- 说明：Validate a template's configuration.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：storage

#### 431. `GET /api/v1/storage/buckets/`

- 摘要：List Buckets
- Operation ID：`storage-list_buckets`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: array<`BucketPublic`> |

---

#### 432. `POST /api/v1/storage/buckets/`

- 摘要：Create Bucket
- Operation ID：`storage-create_bucket`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `BucketCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `BucketPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 433. `PATCH /api/v1/storage/buckets/{bucket_name}`

- 摘要：Rename Bucket
- Operation ID：`storage-rename_bucket`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `bucket_name` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `BucketUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `BucketPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 434. `DELETE /api/v1/storage/buckets/{bucket_name}`

- 摘要：Delete Bucket
- Operation ID：`storage-delete_bucket`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `bucket_name` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 435. `POST /api/v1/storage/buckets/{bucket_name}/files`

- 摘要：Upload File To Bucket
- Operation ID：`storage-upload_file_to_bucket`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `bucket_name` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`multipart/form-data`: `Body_storage-upload_file_to_bucket`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `FileUploadPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 436. `GET /api/v1/storage/files/{bucket_name}/{object_name}`

- 摘要：Read a public stored file
- Operation ID：`storage-read_public_file`
- 说明：Streams a file from object storage through the backend. Generated attachment visual asset URLs use this same-origin path so task preview pages can load images through the public backend port instead of a private MinIO endpoint.
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `bucket_name` | `path` | 是 | `string` |  |  |  |
| `object_name` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Stored file stream. Content-Type and Content-Length mirror object metadata. | `application/json`: object |
| `404` | Bucket or object not found |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：task-portal

#### 437. `GET /api/admin/agents/lifecycle-candidates/hot`

- 摘要：List Hot Lifecycle Candidates
- Operation ID：`task-portal-list_hot_lifecycle_candidates`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `min_daily_invocations` | `query` | 否 | `integer` | default=1000; minimum=0 |  | 1000 |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=0; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `LifecycleHotCandidatesPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 438. `GET /api/admin/agents/lifecycle-candidates/idle`

- 摘要：List Idle Lifecycle Candidates
- Operation ID：`task-portal-list_idle_lifecycle_candidates`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `idle_days` | `query` | 否 | `integer` | default=7; minimum=1 |  | 7 |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=1; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `LifecycleIdleCandidatesPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 439. `POST /api/admin/agents/{agent_id}/demote`

- 摘要：Demote Admin Agent
- Operation ID：`task-portal-demote_admin_agent`
- 说明：创建降级审批申请（返回 202 Accepted 而非直接执行）。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `AgentLifecycleDemote`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 440. `POST /api/admin/agents/{agent_id}/promote`

- 摘要：Promote Admin Agent
- Operation ID：`task-portal-promote_admin_agent`
- 说明：创建晋升审批申请（返回 202 Accepted 而非直接执行）。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `AgentLifecyclePromote`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 441. `GET /api/admin/metrics/overview`

- 摘要：Get Admin Metrics Overview
- Operation ID：`task-portal-get_admin_metrics_overview`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `period` | `query` | 否 | `string` | default=week |  | week |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `PlatformMetricsOverviewPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 442. `GET /api/admin/skills`

- 摘要：List Admin Skills
- Operation ID：`task-portal-list_admin_skills`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `category` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `environment` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `visibility` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `owner_tenant_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=0; maximum=200 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `SkillListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 443. `POST /api/admin/skills`

- 摘要：Create Admin Skill
- Operation ID：`task-portal-create_admin_skill`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `SkillCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `SkillMutationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 444. `GET /api/admin/skills/{skill_id}`

- 摘要：Get Admin Skill Detail
- Operation ID：`task-portal-get_admin_skill_detail`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `SkillDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 445. `PUT /api/admin/skills/{skill_id}`

- 摘要：Update Admin Skill
- Operation ID：`task-portal-update_admin_skill`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `SkillUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `SkillMutationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 446. `DELETE /api/admin/skills/{skill_id}`

- 摘要：Delete Admin Skill
- Operation ID：`task-portal-delete_admin_skill`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `SkillDeletePublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 447. `GET /api/admin/tasks`

- 摘要：List Admin Tasks
- Operation ID：`task-portal-list_admin_tasks`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` | default=active |  | active |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=0; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AdminTaskListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 448. `GET /api/admin/tasks/stats`

- 摘要：Get Admin Task Stats
- Operation ID：`task-portal-get_admin_task_stats`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` | default=active |  | active |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `AdminTaskStatsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 449. `POST /api/admin/tasks/{task_id}/reject`

- 摘要：Reject Admin Task
- Operation ID：`task-portal-reject_admin_task`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `AdminTaskReject`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskActionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 450. `POST /api/admin/tasks/{task_id}/reprompt`

- 摘要：Reprompt Admin Task
- Operation ID：`task-portal-reprompt_admin_task`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `AdminTaskReprompt`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskActionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 451. `GET /api/admin/tasks/{task_id}/snapshot`

- 摘要：Get Admin Task Snapshot
- Operation ID：`task-portal-get_admin_task_snapshot`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskSnapshotPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 452. `GET /api/tasks/{task_id}/data`

- 摘要：Get Task Widget Data
- Operation ID：`task-portal-get_task_widget_data`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `widget_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `page` | `query` | 否 | `integer` | default=1; minimum=1 |  | 1 |
| `page_size` | `query` | 否 | `integer` | default=10; minimum=1; maximum=100 |  | 10 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskWidgetDataPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 453. `GET /api/tasks/{task_id}/deployment`

- 摘要：Get Task Deployment
- Operation ID：`task-portal-get_task_deployment`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkOrderDeploymentPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 454. `POST /api/tasks/{task_id}/deployment/rebuild-static`

- 摘要：Rebuild Task Static Deployment
- Operation ID：`task-portal-rebuild_task_static_deployment`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkOrderDeploymentPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 455. `GET /api/tasks/{task_id}/layout`

- 摘要：Get Task Layout
- Operation ID：`task-portal-get_task_layout`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskLayoutPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 456. `GET /api/tasks/{task_id}/mock-api`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 457. `POST /api/tasks/{task_id}/mock-api`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 458. `PUT /api/tasks/{task_id}/mock-api`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 459. `PATCH /api/tasks/{task_id}/mock-api`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 460. `DELETE /api/tasks/{task_id}/mock-api`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 461. `OPTIONS /api/tasks/{task_id}/mock-api`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 462. `HEAD /api/tasks/{task_id}/mock-api`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 463. `GET /api/tasks/{task_id}/mock-api/{subpath}`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 464. `POST /api/tasks/{task_id}/mock-api/{subpath}`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 465. `PUT /api/tasks/{task_id}/mock-api/{subpath}`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 466. `PATCH /api/tasks/{task_id}/mock-api/{subpath}`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 467. `DELETE /api/tasks/{task_id}/mock-api/{subpath}`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 468. `OPTIONS /api/tasks/{task_id}/mock-api/{subpath}`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 469. `HEAD /api/tasks/{task_id}/mock-api/{subpath}`

- 摘要：Task Mock Api
- Operation ID：`task-portal-task_mock_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `subpath` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 470. `GET /api/tasks/{task_id}/ppt/download`

- 摘要：Download the PPTX artifact generated by a PPT work order
- Operation ID：`task-portal-download_task_ppt`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Generated PPTX file. | `application/json`: object<br>`application/octet-stream`: object |
| `404` | Task or PPT artifact not found. |  |
| `502` | PPT Master download failed. |  |
| `503` | PPT Master is not configured. |  |
| `504` | PPT Master timed out. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 471. `GET /api/tasks/{task_id}/preview`

- 摘要：Preview Task Output
- Operation ID：`task-portal-preview_task_output`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `file_path` | `query` | 否 | `string` | default=index.html |  | index.html |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 472. `GET /api/tasks/{task_id}/preview/api/{runtime_path}`

- 摘要：Proxy Task Preview Api
- Operation ID：`task-portal-proxy_task_preview_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 473. `POST /api/tasks/{task_id}/preview/api/{runtime_path}`

- 摘要：Proxy Task Preview Api
- Operation ID：`task-portal-proxy_task_preview_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 474. `PUT /api/tasks/{task_id}/preview/api/{runtime_path}`

- 摘要：Proxy Task Preview Api
- Operation ID：`task-portal-proxy_task_preview_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 475. `PATCH /api/tasks/{task_id}/preview/api/{runtime_path}`

- 摘要：Proxy Task Preview Api
- Operation ID：`task-portal-proxy_task_preview_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 476. `DELETE /api/tasks/{task_id}/preview/api/{runtime_path}`

- 摘要：Proxy Task Preview Api
- Operation ID：`task-portal-proxy_task_preview_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 477. `OPTIONS /api/tasks/{task_id}/preview/api/{runtime_path}`

- 摘要：Proxy Task Preview Api
- Operation ID：`task-portal-proxy_task_preview_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 478. `POST /api/tasks/{task_id}/preview/errors`

- 摘要：Report Task Preview Error
- Operation ID：`task-portal-report_task_preview_error`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskActionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 479. `GET /api/tasks/{task_id}/preview/{file_path}`

- 摘要：Preview Task Output
- Operation ID：`task-portal-preview_task_output`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `file_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 480. `DELETE /api/tasks/{task_id}/project`

- 摘要：Delete Task Project
- Operation ID：`task-portal-delete_task_project`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskActionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 481. `POST /api/tasks/{task_id}/project/start`

- 摘要：Start Task Project
- Operation ID：`task-portal-start_task_project`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskActionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 482. `POST /api/tasks/{task_id}/project/stop`

- 摘要：Stop Task Project
- Operation ID：`task-portal-stop_task_project`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TaskActionPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 483. `GET /api/tasks/{task_id}/runtime/{runtime_path}`

- 摘要：Call Task Runtime Api
- Operation ID：`task-portal-call_task_runtime_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 484. `POST /api/tasks/{task_id}/runtime/{runtime_path}`

- 摘要：Call Task Runtime Api
- Operation ID：`task-portal-call_task_runtime_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 485. `PUT /api/tasks/{task_id}/runtime/{runtime_path}`

- 摘要：Call Task Runtime Api
- Operation ID：`task-portal-call_task_runtime_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 486. `PATCH /api/tasks/{task_id}/runtime/{runtime_path}`

- 摘要：Call Task Runtime Api
- Operation ID：`task-portal-call_task_runtime_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 487. `DELETE /api/tasks/{task_id}/runtime/{runtime_path}`

- 摘要：Call Task Runtime Api
- Operation ID：`task-portal-call_task_runtime_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 488. `OPTIONS /api/tasks/{task_id}/runtime/{runtime_path}`

- 摘要：Call Task Runtime Api
- Operation ID：`task-portal-call_task_runtime_api`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `task_id` | `path` | 是 | `string` |  |  |  |
| `runtime_path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 489. `GET /api/tenant/agents`

- 摘要：List Tenant Agents
- Operation ID：`task-portal-list_tenant_agents`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=0; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantAgentListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 490. `GET /api/tenant/agents/{agent_id}`

- 摘要：Get Tenant Agent Detail
- Operation ID：`task-portal-get_tenant_agent_detail`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantAgentDetailPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 491. `PUT /api/tenant/agents/{agent_id}/budget`

- 摘要：Update Tenant Agent Budget
- Operation ID：`task-portal-update_tenant_agent_budget`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `TenantAgentBudgetUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantAgentBudgetPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 492. `GET /api/tenant/apps`

- 摘要：List Tenant App Menu
- Operation ID：`task-portal-list_tenant_app_menu`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantAppMenuPublic` |

---

#### 493. `POST /api/tenant/apps`

- 摘要：Create Tenant App Menu Node
- Operation ID：`task-portal-create_tenant_app_menu_node`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `TenantAppMenuNodeCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantAppMenuNode` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 494. `DELETE /api/tenant/apps/{agent_id}`

- 摘要：Delete Tenant App Menu Node
- Operation ID：`task-portal-delete_tenant_app_menu_node`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 495. `GET /api/tenant/backend-services/swagger-docs`

- 摘要：List Tenant Backend Swagger Docs
- Operation ID：`task-portal-list_tenant_backend_swagger_docs`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=0; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `BackendServiceSwaggerDocsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 496. `GET /api/tenant/billing/balance`

- 摘要：Get Tenant Billing Balance
- Operation ID：`task-portal-get_tenant_billing_balance`
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantBillingBalancePublic` |

---

#### 497. `GET /api/tenant/billing/records`

- 摘要：List Tenant Billing Records
- Operation ID：`task-portal-list_tenant_billing_records`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_id` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `resource_type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `start_date` | `query` | 否 | `anyOf(string (date), null)` |  |  |  |
| `end_date` | `query` | 否 | `anyOf(string (date), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=50; minimum=0; maximum=500 |  | 50 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantBillingRecordsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 498. `GET /api/tenant/billing/records/{record_id}`

- 摘要：Get Tenant Billing Record Detail
- Operation ID：`task-portal-get_tenant_billing_record_detail`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `record_id` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantBillingRecordPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 499. `GET /api/tenant/deployments`

- 摘要：List Tenant Deployments
- Operation ID：`task-portal-list_tenant_deployments`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(`WorkOrderDeploymentStatus`, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=0; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WorkOrderDeploymentsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 500. `GET /api/tenant/tasks`

- 摘要：List Tenant Tasks
- Operation ID：`task-portal-list_tenant_tasks`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `status` | `query` | 否 | `anyOf(string, null)` | default=active |  | active |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=0; maximum=100 |  | 20 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `TenantTaskListPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：tools

#### 501. `POST /api/v1/internal/tool-registry/registrations`

- 摘要：Consume one immutable API Tool registration event
- Operation ID：`tools-register_tool_projection`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `Idempotency-Key` | `header` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ToolRegistrationEvent`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `ToolRegistryProjectionInternal` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 502. `POST /api/v1/internal/tool-registry/resolve`

- 摘要：Resolve one frozen Tool reference for an explicit purpose
- Operation ID：`tools-resolve_tool_projection`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ToolRegistryResolveRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolRegistryProjectionInternal` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 503. `GET /api/v1/internal/tool-registry/tools`

- 摘要：List unified Tool Registry projections without hidden executor fields
- Operation ID：`tools-list_tool_projections`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |
| `source_type` | `query` | 否 | `anyOf(string (api_tool, plugin_tool), null)` |  |  |  |
| `operation_type` | `query` | 否 | `anyOf(string (read, write), null)` |  |  |  |
| `lifecycle_status` | `query` | 否 | `anyOf(string (active, deprecated, revoked), null)` | default=active |  | active |
| `q` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `cursor` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=100 |  | 100 |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolRegistryProjectionPage` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 504. `GET /api/v1/internal/tool-registry/tools/{tool_id}/versions/{source_version}`

- 摘要：Read one exact unified Tool Registry projection
- Operation ID：`tools-get_tool_projection`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tool_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `source_version` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 是 | `string (uuid)` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolRegistryProjectionInternal` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 505. `POST /api/v1/internal/tool-registry/tools/{tool_id}/versions/{source_version}/deprecations`

- 摘要：Deprecate one exact Tool version
- Operation ID：`tools-deprecate_tool_projection`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tool_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `source_version` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ToolLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolRegistryProjectionInternal` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 506. `POST /api/v1/internal/tool-registry/tools/{tool_id}/versions/{source_version}/revocations`

- 摘要：Revoke one exact Tool version
- Operation ID：`tools-revoke_tool_projection`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tool_id` | `path` | 是 | `string (uuid)` |  |  |  |
| `source_version` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ToolLifecycleRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolRegistryProjectionInternal` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 507. `POST /api/v1/internal/tools/{tool_ref}/invoke`

- 摘要：Invoke one immutable read-only tool as a trusted internal service
- Operation ID：`tools-invoke_tool_internal`
- 鉴权：`未声明`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tool_ref` | `path` | 是 | `string` |  |  |  |
| `authorization` | `header` | 否 | `anyOf(string, null)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ToolInternalInvocationRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolInvocationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 508. `GET /api/v1/tools`

- 摘要：List visible read-only tools for the current organization
- Operation ID：`tools-list_tools`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolRegistrationsPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 509. `POST /api/v1/tools/web-research`

- 摘要：Run web search, page parsing, cleanup, and evidence slotting
- Operation ID：`tools-web_research`
- 说明：Requires Bearer [REDACTED_TOKEN] The backend runs a lightweight evidence orchestration flow before Hermes generation: search public web results from the user query, parse selected result pages, clean navigation/noise/duplicate text, and normalize useful content into evidence slots such as basis, requirements, architecture, configuration, interfaces, acceptance, risks, and open questions. Configure TAVILY_API_KEY for the primary search/parser path. If Tavily is not configured, the route falls back to the existing Hermes web_search and web_extract transport when available.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `WebResearchRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `WebResearchPublic` |
| `401` | Missing or invalid bearer token. |  |
| `403` | Authenticated user is not allowed to use this tool. |  |
| `422` | Invalid request body, query length, top_k, or extract_pages. |  |
| `502` | Hermes returned an error or invalid response. |  |
| `503` | Hermes or Hermes web backend is not configured. |  |
| `504` | Hermes timed out. |  |

---

#### 510. `GET /api/v1/tools/{tool_ref}`

- 摘要：Read one visible read-only tool declaration
- Operation ID：`tools-get_tool_detail`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tool_ref` | `path` | 是 | `string` |  |  |  |
| `organization_id` | `query` | 否 | `anyOf(string (uuid), null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolRegistrationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 511. `POST /api/v1/tools/{tool_ref}/invoke`

- 摘要：Invoke one visible read-only tool through the fixed plugin gateway
- Operation ID：`tools-invoke_tool`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `tool_ref` | `path` | 是 | `string` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `ToolInvocationRequest`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `ToolInvocationPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：umc-federated-auth

#### 512. `GET /api/v1/admin/umc-user-mappings`

- 摘要：List UMC user role mappings
- Operation ID：`umc-federated-auth-list_umc_user_mappings`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `keyword` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `platform_role` | `query` | 否 | `anyOf(string (customer, admin), null)` |  |  |  |
| `enabled` | `query` | 否 | `anyOf(boolean, null)` |  |  |  |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100; minimum=1; maximum=500 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UmcUserMappingsPublic` |
| `403` | Superuser permission is required. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 513. `POST /api/v1/admin/umc-user-mappings`

- 摘要：Map a UMC user to Customer or Admin
- Operation ID：`umc-federated-auth-create_umc_user_mapping`
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `UmcUserMappingCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `UmcUserMappingPublic` |
| `403` | Superuser permission is required. |  |
| `409` | The UMC user ID is already mapped. |  |
| `422` | The role or request fields are invalid. |  |
| `503` | The configured platform role account is unavailable. |  |

---

#### 514. `PUT /api/v1/admin/umc-user-mappings/{mapping_id}`

- 摘要：Update a UMC user role mapping
- Operation ID：`umc-federated-auth-update_umc_user_mapping`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `mapping_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `UmcUserMappingUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UmcUserMappingPublic` |
| `403` | Superuser permission is required. |  |
| `404` | The mapping does not exist. |  |
| `422` | The role or request fields are invalid. |  |

---

#### 515. `DELETE /api/v1/admin/umc-user-mappings/{mapping_id}`

- 摘要：Delete a UMC user role mapping
- Operation ID：`umc-federated-auth-delete_umc_user_mapping`
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `mapping_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `204` | Successful Response |  |
| `403` | Superuser permission is required. |  |
| `404` | The mapping does not exist. |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：users

#### 516. `GET /api/v1/users/`

- 摘要：Read Users
- Operation ID：`users-read_users`
- 说明：Retrieve users. Non-platform administrators only see users in their own<br>tenants.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=100 |  | 100 |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UsersPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 517. `POST /api/v1/users/`

- 摘要：Create User
- Operation ID：`users-create_user`
- 说明：Create a new user. ``organization_id`` is required; non-platform<br>administrators may only bind users to their own primary tenant.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `UserCreate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UserPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 518. `GET /api/v1/users/me`

- 摘要：Read User Me
- Operation ID：`users-read_user_me`
- 说明：Get current user.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UserPublic` |

---

#### 519. `PATCH /api/v1/users/me`

- 摘要：Update User Me
- Operation ID：`users-update_user_me`
- 说明：Update own user.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `UserUpdateMe`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UserPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 520. `DELETE /api/v1/users/me`

- 摘要：Delete User Me
- Operation ID：`users-delete_user_me`
- 说明：Delete own user.
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |

---

#### 521. `PATCH /api/v1/users/me/password`

- 摘要：Update Password Me
- Operation ID：`users-update_password_me`
- 说明：Update own password.
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: `UpdatePassword`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 522. `GET /api/v1/users/{user_id}`

- 摘要：Read User By Id
- Operation ID：`users-read_user_by_id`
- 说明：Get a specific user by id. Cross-tenant lookups return 404 to avoid<br>leaking existence to tenant administrators.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UserPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 523. `PATCH /api/v1/users/{user_id}`

- 摘要：Update User
- Operation ID：`users-update_user`
- 说明：Update a user. Tenant changes require a platform administrator.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Request Body**

- Content-Type / Schema：`application/json`: `UserUpdate`
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `UserPublic` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 524. `DELETE /api/v1/users/{user_id}`

- 摘要：Delete User
- Operation ID：`users-delete_user`
- 说明：Delete a user.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | `path` | 是 | `string (uuid)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：utils

#### 525. `GET /api/v1/utils/health-check/`

- 摘要：Health Check
- Operation ID：`utils-health_check`
- 鉴权：`未声明`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: boolean |

---

#### 526. `POST /api/v1/utils/test-email/`

- 摘要：Test Email
- Operation ID：`utils-test_email`
- 说明：Test emails.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `email_to` | `query` | 是 | `string (email)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `201` | Successful Response | `application/json`: `Message` |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：workflow-proxy

#### 527. `GET /api/v1/flowise/{path}`

- 摘要：代理 Flowise 工作流设计接口
- Operation ID：`workflow-proxy-proxy_flowise`
- 说明：验证当前用户和租户后，将 Flowise 画布会话、草稿同步等请求转发到 workflow-service，并透传安全的浏览器会话 Cookie。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Flowise 工作流请求成功 | `application/json`: object |
| `403` | 当前用户无租户或工作流访问权限 |  |
| `502` | workflow-service 请求失败 |  |
| `503` | workflow-service 未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 528. `POST /api/v1/flowise/{path}`

- 摘要：代理 Flowise 工作流设计接口
- Operation ID：`workflow-proxy-proxy_flowise`
- 说明：验证当前用户和租户后，将 Flowise 画布会话、草稿同步等请求转发到 workflow-service，并透传安全的浏览器会话 Cookie。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Flowise 工作流请求成功 | `application/json`: object |
| `403` | 当前用户无租户或工作流访问权限 |  |
| `502` | workflow-service 请求失败 |  |
| `503` | workflow-service 未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 529. `PUT /api/v1/flowise/{path}`

- 摘要：代理 Flowise 工作流设计接口
- Operation ID：`workflow-proxy-proxy_flowise`
- 说明：验证当前用户和租户后，将 Flowise 画布会话、草稿同步等请求转发到 workflow-service，并透传安全的浏览器会话 Cookie。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Flowise 工作流请求成功 | `application/json`: object |
| `403` | 当前用户无租户或工作流访问权限 |  |
| `502` | workflow-service 请求失败 |  |
| `503` | workflow-service 未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 530. `PATCH /api/v1/flowise/{path}`

- 摘要：代理 Flowise 工作流设计接口
- Operation ID：`workflow-proxy-proxy_flowise`
- 说明：验证当前用户和租户后，将 Flowise 画布会话、草稿同步等请求转发到 workflow-service，并透传安全的浏览器会话 Cookie。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Flowise 工作流请求成功 | `application/json`: object |
| `403` | 当前用户无租户或工作流访问权限 |  |
| `502` | workflow-service 请求失败 |  |
| `503` | workflow-service 未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 531. `DELETE /api/v1/flowise/{path}`

- 摘要：代理 Flowise 工作流设计接口
- Operation ID：`workflow-proxy-proxy_flowise`
- 说明：验证当前用户和租户后，将 Flowise 画布会话、草稿同步等请求转发到 workflow-service，并透传安全的浏览器会话 Cookie。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Flowise 工作流请求成功 | `application/json`: object |
| `403` | 当前用户无租户或工作流访问权限 |  |
| `502` | workflow-service 请求失败 |  |
| `503` | workflow-service 未配置 |  |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 532. `GET /api/v1/platform-apps`

- 摘要：Proxy Platform Apps
- Operation ID：`workflow-proxy-proxy_platform_apps`
- 说明：Proxy /api/v1/platform-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 533. `GET /api/v1/platform-apps/{path}`

- 摘要：Proxy Platform Apps
- Operation ID：`workflow-proxy-proxy_platform_apps`
- 说明：Proxy /api/v1/platform-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 534. `POST /api/v1/platform-apps/{path}`

- 摘要：Proxy Platform Apps
- Operation ID：`workflow-proxy-proxy_platform_apps`
- 说明：Proxy /api/v1/platform-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 535. `PUT /api/v1/platform-apps/{path}`

- 摘要：Proxy Platform Apps
- Operation ID：`workflow-proxy-proxy_platform_apps`
- 说明：Proxy /api/v1/platform-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 536. `PATCH /api/v1/platform-apps/{path}`

- 摘要：Proxy Platform Apps
- Operation ID：`workflow-proxy-proxy_platform_apps`
- 说明：Proxy /api/v1/platform-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 537. `DELETE /api/v1/platform-apps/{path}`

- 摘要：Proxy Platform Apps
- Operation ID：`workflow-proxy-proxy_platform_apps`
- 说明：Proxy /api/v1/platform-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 538. `GET /api/v1/workflow-admin`

- 摘要：Proxy Workflow Admin
- Operation ID：`workflow-proxy-proxy_workflow_admin`
- 说明：Proxy /api/v1/workflow-admin/** to monorepo workflow service.<br><br>Business logic (cross-tenant filtering, dashboard aggregation, tenants list)<br>is fully implemented in monorepo ``admin_workflow_admin`` router. The main<br>backend only injects identity headers and performs ``admin.workflow_admin.read``<br>permission interception. Returns 403 if the user lacks the permission.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 539. `GET /api/v1/workflow-admin/{path}`

- 摘要：Proxy Workflow Admin
- Operation ID：`workflow-proxy-proxy_workflow_admin`
- 说明：Proxy /api/v1/workflow-admin/** to monorepo workflow service.<br><br>Business logic (cross-tenant filtering, dashboard aggregation, tenants list)<br>is fully implemented in monorepo ``admin_workflow_admin`` router. The main<br>backend only injects identity headers and performs ``admin.workflow_admin.read``<br>permission interception. Returns 403 if the user lacks the permission.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 540. `POST /api/v1/workflow-admin/{path}`

- 摘要：Proxy Workflow Admin
- Operation ID：`workflow-proxy-proxy_workflow_admin`
- 说明：Proxy /api/v1/workflow-admin/** to monorepo workflow service.<br><br>Business logic (cross-tenant filtering, dashboard aggregation, tenants list)<br>is fully implemented in monorepo ``admin_workflow_admin`` router. The main<br>backend only injects identity headers and performs ``admin.workflow_admin.read``<br>permission interception. Returns 403 if the user lacks the permission.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 541. `PUT /api/v1/workflow-admin/{path}`

- 摘要：Proxy Workflow Admin
- Operation ID：`workflow-proxy-proxy_workflow_admin`
- 说明：Proxy /api/v1/workflow-admin/** to monorepo workflow service.<br><br>Business logic (cross-tenant filtering, dashboard aggregation, tenants list)<br>is fully implemented in monorepo ``admin_workflow_admin`` router. The main<br>backend only injects identity headers and performs ``admin.workflow_admin.read``<br>permission interception. Returns 403 if the user lacks the permission.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 542. `PATCH /api/v1/workflow-admin/{path}`

- 摘要：Proxy Workflow Admin
- Operation ID：`workflow-proxy-proxy_workflow_admin`
- 说明：Proxy /api/v1/workflow-admin/** to monorepo workflow service.<br><br>Business logic (cross-tenant filtering, dashboard aggregation, tenants list)<br>is fully implemented in monorepo ``admin_workflow_admin`` router. The main<br>backend only injects identity headers and performs ``admin.workflow_admin.read``<br>permission interception. Returns 403 if the user lacks the permission.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 543. `DELETE /api/v1/workflow-admin/{path}`

- 摘要：Proxy Workflow Admin
- Operation ID：`workflow-proxy-proxy_workflow_admin`
- 说明：Proxy /api/v1/workflow-admin/** to monorepo workflow service.<br><br>Business logic (cross-tenant filtering, dashboard aggregation, tenants list)<br>is fully implemented in monorepo ``admin_workflow_admin`` router. The main<br>backend only injects identity headers and performs ``admin.workflow_admin.read``<br>permission interception. Returns 403 if the user lacks the permission.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 544. `GET /api/v1/workflow-apps`

- 摘要：Proxy Workflow Apps
- Operation ID：`workflow-proxy-proxy_workflow_apps`
- 说明：Proxy /api/v1/workflow-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 545. `POST /api/v1/workflow-apps`

- 摘要：Proxy Workflow Apps
- Operation ID：`workflow-proxy-proxy_workflow_apps`
- 说明：Proxy /api/v1/workflow-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `query` | 否 | `string` | default= |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 546. `GET /api/v1/workflow-apps/{path}`

- 摘要：Proxy Workflow Apps
- Operation ID：`workflow-proxy-proxy_workflow_apps`
- 说明：Proxy /api/v1/workflow-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 547. `POST /api/v1/workflow-apps/{path}`

- 摘要：Proxy Workflow Apps
- Operation ID：`workflow-proxy-proxy_workflow_apps`
- 说明：Proxy /api/v1/workflow-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 548. `PUT /api/v1/workflow-apps/{path}`

- 摘要：Proxy Workflow Apps
- Operation ID：`workflow-proxy-proxy_workflow_apps`
- 说明：Proxy /api/v1/workflow-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 549. `PATCH /api/v1/workflow-apps/{path}`

- 摘要：Proxy Workflow Apps
- Operation ID：`workflow-proxy-proxy_workflow_apps`
- 说明：Proxy /api/v1/workflow-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 550. `DELETE /api/v1/workflow-apps/{path}`

- 摘要：Proxy Workflow Apps
- Operation ID：`workflow-proxy-proxy_workflow_apps`
- 说明：Proxy /api/v1/workflow-apps/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 551. `GET /api/v1/workflow-conversations/{path}`

- 摘要：Proxy Workflow Conversations
- Operation ID：`workflow-proxy-proxy_workflow_conversations`
- 说明：Proxy /api/v1/workflow-conversations/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 552. `POST /api/v1/workflow-conversations/{path}`

- 摘要：Proxy Workflow Conversations
- Operation ID：`workflow-proxy-proxy_workflow_conversations`
- 说明：Proxy /api/v1/workflow-conversations/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 553. `PUT /api/v1/workflow-conversations/{path}`

- 摘要：Proxy Workflow Conversations
- Operation ID：`workflow-proxy-proxy_workflow_conversations`
- 说明：Proxy /api/v1/workflow-conversations/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 554. `PATCH /api/v1/workflow-conversations/{path}`

- 摘要：Proxy Workflow Conversations
- Operation ID：`workflow-proxy-proxy_workflow_conversations`
- 说明：Proxy /api/v1/workflow-conversations/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 555. `DELETE /api/v1/workflow-conversations/{path}`

- 摘要：Proxy Workflow Conversations
- Operation ID：`workflow-proxy-proxy_workflow_conversations`
- 说明：Proxy /api/v1/workflow-conversations/** to monorepo workflow service.
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `path` | `path` | 是 | `string` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

### Tag：安全边界

#### 556. `POST /api/v1/security-boundary/checks/environment`

- 摘要：检查运行环境是否在批准范围内
- Operation ID：`安全边界-check_security_boundary_environment`
- 说明：需要 admin.security_boundary.check 权限。
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 557. `POST /api/v1/security-boundary/checks/outbound`

- 摘要：检查外联目标是否在批准范围内
- Operation ID：`安全边界-check_security_boundary_outbound`
- 说明：需要 admin.security_boundary.check 权限。
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 558. `POST /api/v1/security-boundary/checks/runtime-path`

- 摘要：检查运行路径是否位于批准根目录下
- Operation ID：`安全边界-check_security_boundary_runtime_path`
- 说明：需要 admin.security_boundary.check 权限。
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 559. `POST /api/v1/security-boundary/checks/storage`

- 摘要：检查对象存储目标是否在批准范围内
- Operation ID：`安全边界-check_security_boundary_storage`
- 说明：需要 admin.security_boundary.check 权限。
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 560. `GET /api/v1/security-boundary/config`

- 摘要：查看当前安全边界配置
- Operation ID：`安全边界-get_security_boundary_config`
- 说明：需要 admin.security_boundary.read 权限，读取当前环境、外联、存储和运行路径白名单配置。
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 561. `PATCH /api/v1/security-boundary/config`

- 摘要：更新当前安全边界配置
- Operation ID：`安全边界-update_security_boundary_config`
- 说明：需要 admin.security_boundary.manage 权限。审批流程尚未接入，因此当前阶段由 RBAC 直接限制可修改人员，授权修改会立即生效。
- 鉴权：`OAuth2PasswordBearer`

**Request Body**

- Content-Type / Schema：`application/json`: object
- 必填：是

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

#### 562. `POST /api/v1/security-boundary/deployment-checks`

- 摘要：执行安全边界部署检查
- Operation ID：`安全边界-run_security_boundary_deployment_check`
- 说明：需要 admin.security_boundary.check 权限，检查当前部署配置是否满足安全边界要求。
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 563. `GET /api/v1/security-boundary/deployment-checks/latest`

- 摘要：查看最近一次安全边界部署检查
- Operation ID：`安全边界-get_latest_security_boundary_deployment_check`
- 说明：需要 admin.security_boundary.read 权限。
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 564. `GET /api/v1/security-boundary/health`

- 摘要：检查安全边界服务就绪状态
- Operation ID：`安全边界-security_boundary_health`
- 说明：需要 admin.security_boundary.read 权限，用于确认安全边界独立服务是否可访问。
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `503` | Security boundary service is not configured. |  |

---

#### 565. `GET /api/v1/security-boundary/openapi.json`

- 摘要：获取安全边界服务 OpenAPI 文档
- Operation ID：`安全边界-security_boundary_openapi`
- 说明：需要 admin.security_boundary.read 权限，返回安全边界独立服务的原始 OpenAPI 契约。
- 鉴权：`OAuth2PasswordBearer`

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |

---

#### 566. `GET /api/v1/security-boundary/violations`

- 摘要：查询安全边界违规事件
- Operation ID：`安全边界-list_security_boundary_violations`
- 说明：需要 admin.security_boundary.read 权限，支持按事件类型、动作和调用方过滤。
- 鉴权：`OAuth2PasswordBearer`

**Parameters**

| Name | In | Required | Type | Constraints | Description | Example/Default |
| --- | --- | --- | --- | --- | --- | --- |
| `skip` | `query` | 否 | `integer` | default=0; minimum=0 |  | 0 |
| `limit` | `query` | 否 | `integer` | default=20; minimum=1; maximum=100 |  | 20 |
| `event_type` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `action` | `query` | 否 | `anyOf(string, null)` |  |  |  |
| `caller` | `query` | 否 | `anyOf(string, null)` |  |  |  |

**Responses**

| Status | Description | Content / Schema |
| --- | --- | --- |
| `200` | Successful Response | `application/json`: object |
| `422` | Validation Error | `application/json`: `HTTPValidationError` |

---

## Components Schemas

以下 Schema 名称可直接对应 Swagger 的 `#/components/schemas/...` 引用。

### `AdminDataGatewayTokenPublic`

- Type：`object`
- Required：`access_token`, `expires_in`, `expires_at`, `subject_id`, `tenant_id`, `issued_for_email`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `access_token` | `string` | 是 | 数据网关专用 JWT。调用数据网关时使用 Authorization: Bearer <access_token>。 |  |
| `token_type` | `string` | 否 | 固定为 bearer。 | default=bearer |
| `expires_in` | `integer` | 是 | 剩余有效期，单位秒。 |  |
| `expires_at` | `string (date-time)` | 是 | Token 过期时间。 |  |
| `subject_id` | `string` | 是 | 签发用户 ID，会写入 JWT sub。 |  |
| `tenant_id` | `string` | 是 | 签发用户主组织 ID，会写入 JWT tenant_id。 |  |
| `issued_for_email` | `string` | 是 | 被签发用户邮箱。 |  |
| `issued_for_name` | `anyOf(string, null)` | 否 | 被签发用户姓名。 |  |

### `AdminTaskListPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`AdminTaskSummaryPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `AdminTaskReject`

- Type：`object`
- Required：`reason`, `operator_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `reason` | `string` | 是 |  | minLength=1 |
| `operator_id` | `string` | 是 |  | minLength=1; maxLength=64 |

### `AdminTaskReprompt`

- Type：`object`
- Required：`prompt_hint`, `operator_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `prompt_hint` | `string` | 是 |  | minLength=1 |
| `operator_id` | `string` | 是 |  | minLength=1; maxLength=64 |

### `AdminTaskStatsPublic`

- Type：`object`
- Required：`total_count`, `active_count`, `pending_approval_count`, `failed_count`, `filtered_count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `total_count` | `integer` | 是 |  |  |
| `active_count` | `integer` | 是 |  |  |
| `pending_approval_count` | `integer` | 是 |  |  |
| `failed_count` | `integer` | 是 |  |  |
| `filtered_count` | `integer` | 是 |  |  |

### `AdminTaskSummaryPublic`

- Type：`object`
- Required：`task_id`, `tenant_id`, `title`, `status`, `retry_count`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 |  |  |
| `tenant_id` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string, null)` | 否 |  |  |
| `title` | `string` | 是 |  |  |
| `web_url` | `anyOf(string, null)` | 否 |  |  |
| `web_url_headers` | `anyOf(object, null)` | 否 |  |  |
| `web_url_request` | `anyOf(object, null)` | 否 |  |  |
| `status` | `string` | 是 |  |  |
| `current_node` | `anyOf(string, null)` | 否 |  |  |
| `retry_count` | `integer` | 是 |  |  |
| `last_error` | `anyOf(object, null)` | 否 |  |  |
| `quality_failure` | `anyOf(object, null)` | 否 |  |  |
| `manual_fix_required` | `anyOf(boolean, null)` | 否 |  |  |
| `pending_approval_reason` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `AgentLifecycleDemote`

- Type：`object`
- Required：`reason`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `reason` | `string` | 是 |  | minLength=1 |
| `operator_id` | `anyOf(string, null)` | 否 |  |  |

### `AgentLifecyclePromote`

- Type：`object`
- Required：`reason`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `replicas` | `integer` | 否 |  | default=1; minimum=1.0; maximum=10.0 |
| `resources` | `object` | 否 |  |  |
| `reason` | `string` | 是 |  | minLength=1 |
| `operator_id` | `anyOf(string, null)` | 否 |  |  |

### `AiChatConfig`

- Type：`object`
- Required：`enabled`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `enabled` | `boolean` | 是 |  |  |
| `streaming` | `boolean` | 否 |  | default=True |

### `AiChatMessagePublic`

- Type：`object`
- Required：`role`, `content`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `role` | `string` | 是 |  |  |
| `content` | `string` | 是 |  |  |
| `created_at` | `anyOf(string, null)` | 否 |  |  |
| `artifacts` | `array<oneOf(`WorkflowRuntimeTodoListArtifactPublic`, `WorkflowRuntimeDataTableArtifactPublic`, `WorkflowRuntimeKeyValueArtifactPublic`, `WorkflowRuntimeTimelineArtifactPublic`, `WorkflowRuntimeRecordListArtifactPublic`)>` | 否 |  | maxItems=4 |

### `AiChatMessageRequest`

- Type：`object`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `message` | `string` | 否 |  | default=; maxLength=32000 |
| `conversation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `request_id` | `anyOf(string, null)` | 否 |  |  |
| `interaction_response` | `anyOf(`WorkflowRuntimeInteractionResponse`, null)` | 否 |  |  |

### `AiChatMessagesPublic`

- Type：`object`
- Required：`conversation_id`, `messages`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `conversation_id` | `string (uuid)` | 是 |  |  |
| `messages` | `array<`AiChatMessagePublic`>` | 是 |  |  |

### `AiConversationPublic`

- Type：`object`
- Required：`id`, `title`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `AiConversationsPublic`

- Type：`object`
- Required：`conversations`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `conversations` | `array<`AiConversationPublic`>` | 是 |  |  |

### `AiRuntimeStatusPublic`

- Type：`object`
- Required：`runtime`, `healthy`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `runtime` | `string` | 是 | Active AI runtime: hermes, claw, or openai. |  |
| `model` | `anyOf(string, null)` | 否 | Configured model name for the active runtime. |  |
| `base_url` | `anyOf(string, null)` | 否 | Configured HTTP base URL when the runtime uses one. |  |
| `healthy` | `boolean` | 是 | Whether the runtime status probe succeeded. |  |
| `details` | `object` | 否 | Runtime-specific health and capability details. |  |
| `error` | `anyOf(string, null)` | 否 | Error message when the runtime probe fails. |  |

### `ApplicationItem`

- Type：`object`
- Required：`id`, `applicationDetailsId`, `applicationNumber`, `serviceId`, `serviceCode`, `serviceNameEn`, `serviceNameAr`, `createdOn`, `applicationStatusId`, `applicationStatusNameEn`, `applicationStatusNameAr`, `type`, `typeNameEn`, `typeNameAr`, `certificateId`, `orderAmount`, `currencyCode`, `paymentStatus`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `integer` | 是 |  |  |
| `applicationDetailsId` | `integer` | 是 |  |  |
| `applicationNumber` | `string` | 是 |  |  |
| `serviceId` | `integer` | 是 |  |  |
| `serviceCode` | `string` | 是 |  |  |
| `serviceNameEn` | `string` | 是 |  |  |
| `serviceNameAr` | `string` | 是 |  |  |
| `createdOn` | `string (date-time)` | 是 |  |  |
| `applicationStatusId` | `integer` | 是 |  |  |
| `applicationStatusNameEn` | `string` | 是 |  |  |
| `applicationStatusNameAr` | `string` | 是 |  |  |
| `type` | `string (NEW, RENEW)` | 是 |  |  |
| `typeNameEn` | `string` | 是 |  |  |
| `typeNameAr` | `string` | 是 |  |  |
| `certificateId` | `anyOf(integer, null)` | 是 |  |  |
| `orderAmount` | `anyOf(integer, null)` | 是 |  |  |
| `currencyCode` | `anyOf(string, null)` | 是 |  |  |
| `paymentStatus` | `anyOf(integer, null)` | 是 |  |  |

### `ApplicationPageData`

- Type：`object`
- Required：`pageIndex`, `pageSize`, `total`, `items`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `pageIndex` | `integer` | 是 |  |  |
| `pageSize` | `integer` | 是 |  |  |
| `total` | `integer` | 是 |  | minimum=0.0 |
| `items` | `array<`ApplicationItem`>` | 是 |  |  |

### `ApplicationPagePayload`

- Type：`object`
- Required：`applicationStatusCounts`, `applicationPage`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `applicationStatusCounts` | `array<`ApplicationStatusCount`>` | 是 |  |  |
| `applicationPage` | ``ApplicationPageData`` | 是 |  |  |

### `ApplicationPageRequest`

- Type：`object`
- Required：`pageIndex`, `pageSize`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `pageIndex` | `integer` | 是 | One-based page number. | minimum=1.0 |
| `pageSize` | `integer` | 是 | Number of applications returned per page (1-100). | minimum=1.0; maximum=100.0 |

### `ApplicationPageResponse`

- Type：`object`
- Required：`isSuccess`, `statusCode`, `message`, `data`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `isSuccess` | `boolean` | 是 |  |  |
| `statusCode` | `integer` | 是 |  |  |
| `message` | `string` | 是 |  |  |
| `data` | ``ApplicationPagePayload`` | 是 |  |  |

### `ApplicationStatusCount`

- Type：`object`
- Required：`applicationStatusId`, `applicationStatusNameEn`, `applicationStatusNameAr`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `applicationStatusId` | `integer` | 是 |  |  |
| `applicationStatusNameEn` | `string` | 是 |  |  |
| `applicationStatusNameAr` | `string` | 是 |  |  |
| `count` | `integer` | 是 |  | minimum=0.0 |

### `ApproverRefPublic`

审批人引用（解析后的用户 / 角色）。

- Type：`object`
- Required：`id`, `name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `email` | `anyOf(string, null)` | 否 |  |  |

### `AssignableTenant`

- Type：`object`
- Required：`id`, `name`, `code`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `code` | `string` | 是 |  |  |
| `type` | `string` | 否 |  | default=tenant |

### `AttachmentListPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`AttachmentPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `AttachmentPublic`

- Type：`object`
- Required：`id`, `file_name`, `file_extension`, `content_type`, `size_bytes`, `parse_status`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `conversation_key` | `anyOf(string, null)` | 否 |  |  |
| `file_name` | `string` | 是 |  |  |
| `file_extension` | `string` | 是 |  |  |
| `content_type` | `string` | 是 |  |  |
| `size_bytes` | `integer` | 是 |  |  |
| `parse_status` | `string` | 是 |  |  |
| `parsed_text` | `anyOf(string, null)` | 否 |  |  |
| `parse_error` | `anyOf(string, null)` | 否 |  |  |
| `parser_name` | `anyOf(string, null)` | 否 |  |  |
| `parsed_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `event_metadata` | `object` | 否 | Public attachment parser metadata. Storage bucket names, object paths, and derived asset URLs are not exposed. |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `BackendServiceSwaggerDocPublic`

- Type：`object`
- Required：`task_id`, `service_name`, `swagger_ui_url`, `openapi_json_url`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 |  |  |
| `agent_id` | `anyOf(string, null)` | 否 |  |  |
| `service_name` | `string` | 是 |  |  |
| `swagger_ui_url` | `string` | 是 |  |  |
| `openapi_json_url` | `string` | 是 |  |  |
| `preview_doc_url` | `anyOf(string, null)` | 否 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `BackendServiceSwaggerDocsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`BackendServiceSwaggerDocPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `Body_ai-generation-service-upload_ai_generation_dataset_documents`

- Type：`object`
- Required：`files`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `files` | `array<string (binary)>` | 是 | Documents to upload. Maximum size: 500MB per file by default. |  |

### `Body_attachments-upload_attachment`

- Type：`object`
- Required：`file`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `file` | `string (binary)` | 是 | Supported file. Maximum size: 500MB. Allowed extensions: pdf, docx, txt, md, csv, xlsx, png, jpg, jpeg, gif, webp, bmp, svg, ico, avif, tif, tiff. |  |
| `conversation_id` | `anyOf(string, null)` | 否 |  |  |

### `Body_login-login_access_token`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `username` | `anyOf(string, null)` | 否 |  |  |
| `password` | `anyOf(string, null)` | 否 |  |  |

### `Body_plugins-import_plugin_from_compose`

- Type：`object`
- Required：`file`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `file` | `string (binary)` | 是 | A UTF-8 docker-compose.yml, compose.yml, or other .yml/.yaml file. |  |

### `Body_service-catalog-import_workbook`

- Type：`object`
- Required：`file`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `file` | `string (binary)` | 是 |  |  |

### `Body_storage-upload_file_to_bucket`

- Type：`object`
- Required：`file`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `file` | `string (binary)` | 是 |  |  |
| `object_name` | `anyOf(string, null)` | 否 |  |  |

### `BucketCreate`

- Type：`object`
- Required：`name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | pattern=^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ |
| `public` | `boolean` | 否 |  | default=True |

### `BucketPublic`

- Type：`object`
- Required：`name`, `public`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  |  |
| `public` | `boolean` | 是 |  |  |

### `BucketUpdate`

- Type：`object`
- Required：`new_name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `new_name` | `string` | 是 |  | pattern=^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ |
| `public` | `boolean` | 否 |  | default=True |

### `BuiltinPluginInstallPublic`

- Type：`object`
- Required：`installation`, `health`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation` | ``PluginInstallationPublic`` | 是 |  |  |
| `health` | ``PluginHealthCheckPublic`` | 是 |  |  |

### `BuiltinPluginInstallRequest`

- Type：`object`
- Required：`organization_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |

### `ChatbotSessionRequest`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `mode` | `string (auto, public)` | 否 |  | default=auto |

### `ClawPromptRequest`

- Type：`object`
- Required：`prompt`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `prompt` | `string` | 是 |  | minLength=1; maxLength=50000 |
| `output_format` | `string (json, text)` | 否 |  | default=json |

### `ClawPromptResult`

- Type：`object`
- Required：`exit_code`, `stdout`, `stderr`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `exit_code` | `integer` | 是 |  |  |
| `stdout` | `string` | 是 |  |  |
| `stderr` | `string` | 是 |  |  |
| `parsed` | `anyOf(object, null)` | 否 |  |  |

### `ClawStatus`

Runtime probe for the vendored claw CLI (OpenAPI 契约可后续与你方文档对齐).

- Type：`object`
- Required：`claw_home`, `rust_workdir`, `binary_path`, `binary_exists`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `claw_home` | `string` | 是 |  |  |
| `rust_workdir` | `string` | 是 |  |  |
| `binary_path` | `string` | 是 |  |  |
| `binary_exists` | `boolean` | 是 |  |  |
| `version_exit_code` | `anyOf(integer, null)` | 否 |  |  |
| `version_json` | `anyOf(object, null)` | 否 |  |  |
| `version_stdout` | `anyOf(string, null)` | 否 |  |  |
| `version_stderr` | `anyOf(string, null)` | 否 |  |  |
| `error` | `anyOf(string, null)` | 否 |  |  |

### `ComposeImportErrorDetail`

- Type：`object`
- Required：`code`, `message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  |  |
| `message` | `string` | 是 |  |  |
| `reasons` | `array<`ComposeRuntimeIssue`>` | 否 |  |  |

### `ComposeImportErrorResponse`

- Type：`object`
- Required：`detail`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `detail` | ``ComposeImportErrorDetail`` | 是 |  |  |

### `ComposeManifestDraftRequest`

- Type：`object`
- Required：`compose_yaml`, `plugin_id`, `name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `compose_yaml` | `string` | 是 | Docker Compose YAML text. Maximum UTF-8 size is 1 MiB. | minLength=1; maxLength=1048576 |
| `plugin_id` | `string` | 是 |  | maxLength=32; pattern=^[a-z][a-z0-9-]{1,31}$ |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `version` | `string` | 否 |  | default=1.0.0; maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |

### `ComposeManifestDraftResponse`

- Type：`object`
- Required：`manifest`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `manifest` | ``PluginManifest-Output`` | 是 |  |  |
| `warnings` | `array<`ComposeManifestWarning`>` | 否 |  |  |

### `ComposeManifestWarning`

- Type：`object`
- Required：`code`, `message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | maxLength=64; pattern=^[A-Z][A-Z0-9_]{1,63}$ |
| `message` | `string` | 是 |  | minLength=1; maxLength=1000 |
| `service` | `anyOf(string, null)` | 否 |  |  |

### `ComposePluginRegistrationPublic`

- Type：`object`
- Required：`plugin`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `plugin` | ``PluginDefinitionDetail`` | 是 |  |  |
| `warnings` | `array<`ComposeManifestWarning`>` | 否 |  |  |

### `ComposeRuntimeIssue`

- Type：`object`
- Required：`code`, `message`, `resolution`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  |  |
| `message` | `string` | 是 |  |  |
| `service` | `anyOf(string, null)` | 否 |  |  |
| `container` | `anyOf(string, null)` | 否 |  |  |
| `state` | `anyOf(string, null)` | 否 |  |  |
| `health` | `anyOf(string, null)` | 否 |  |  |
| `resolution` | `string` | 是 |  |  |

### `ConversationCreate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `project_id` | `anyOf(string, null)` | 否 |  |  |
| `title` | `anyOf(string, null)` | 否 |  |  |
| `metadata` | `anyOf(object, null)` | 否 |  |  |

### `ConversationDeleteResult`

- Type：`object`
- Required：`deleted`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `deleted` | `boolean` | 是 |  |  |

### `ConversationListPublic`

- Type：`object`
- Required：`sessions`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `sessions` | `array<`ConversationSummary`>` | 是 |  |  |

### `ConversationMediaUrl`

- Type：`object`
- Required：`url`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `url` | `string` | 是 |  |  |
| `name` | `anyOf(string, null)` | 否 |  |  |

### `ConversationMessage`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `role` | `anyOf(string, null)` | 否 |  |  |
| `content` | `anyOf(string, null)` | 否 |  |  |
| `bubble_id` | `anyOf(string, null)` | 否 |  |  |
| `timestamp` | `anyOf(string (date-time), null)` | 否 |  |  |
| `tool_calls` | `anyOf(object, null)` | 否 |  |  |
| `tool_call_id` | `anyOf(string, null)` | 否 |  |  |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `reply_to` | `anyOf(string, null)` | 否 |  |  |
| `kind` | `anyOf(string, null)` | 否 |  |  |
| `media` | `anyOf(array<string>, null)` | 否 |  |  |
| `media_urls` | `anyOf(array<`ConversationMediaUrl`>, null)` | 否 |  |  |
| `metadata` | `anyOf(object, null)` | 否 |  |  |

### `ConversationMessagesPublic`

- Type：`object`
- Required：`key`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  |  |
| `created_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `updated_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `metadata` | `object` | 否 |  |  |
| `messages` | `array<`ConversationMessage`>` | 否 |  | default=[] |

### `ConversationMessagesUpdate`

- Type：`object`
- Required：`messages`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `messages` | `array<`ConversationMessage`>` | 是 |  |  |
| `metadata` | `anyOf(object, null)` | 否 |  |  |
| `title` | `anyOf(string, null)` | 否 |  |  |

### `ConversationPendingTaskConfirmationPublic`

- Type：`object`
- Required：`conversation_id`, `chat_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `conversation_id` | `string` | 是 |  |  |
| `chat_id` | `string` | 是 |  |  |
| `pending_task_confirmation` | `anyOf(`PendingTaskConfirmationPublic`, null)` | 否 |  |  |

### `ConversationPublic`

- Type：`object`
- Required：`key`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  |  |
| `created_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `updated_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `title` | `string` | 否 |  | default= |
| `metadata` | `object` | 否 |  |  |
| `project_id` | `anyOf(string, null)` | 否 |  |  |

### `ConversationSummary`

- Type：`object`
- Required：`key`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  |  |
| `created_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `updated_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `title` | `string` | 否 |  | default= |

### `CurrentOrganizationPublic`

- Type：`object`
- Required：`id`, `name`, `type`, `is_primary`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `type` | `string` | 是 |  |  |
| `is_primary` | `boolean` | 是 |  |  |

### `CurrentRbacProfile`

- Type：`object`
- Required：`user_id`, `is_superuser`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `user_id` | `string (uuid)` | 是 |  |  |
| `is_superuser` | `boolean` | 是 |  |  |
| `role_codes` | `array<string>` | 否 |  |  |
| `permission_codes` | `array<string>` | 否 |  |  |
| `menu_codes` | `array<string>` | 否 |  |  |
| `organizations` | `array<`CurrentOrganizationPublic`>` | 否 |  |  |

### `DataGatewayTokenPublic`

- Type：`object`
- Required：`access_token`, `expires_in`, `expires_at`, `subject_id`, `tenant_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `access_token` | `string` | 是 | 数据网关专用 JWT。调用数据网关时使用 Authorization: Bearer <access_token>。 |  |
| `token_type` | `string` | 否 | 固定为 bearer。 | default=bearer |
| `expires_in` | `integer` | 是 | 剩余有效期，单位秒。 |  |
| `expires_at` | `string (date-time)` | 是 | Token 过期时间。 |  |
| `subject_id` | `string` | 是 | 签发用户 ID，会写入 JWT sub。 |  |
| `tenant_id` | `string` | 是 | 签发用户主组织 ID，会写入 JWT tenant_id。 |  |

### `DevTaskCreate`

- Type：`object`
- Required：`tenant_id`, `created_by`, `markdown`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `tenant_id` | `string` | 是 |  | minLength=1; maxLength=64 |
| `organization_id` | `anyOf(string, null)` | 否 |  |  |
| `created_by` | `string` | 是 |  | minLength=1; maxLength=64 |
| `markdown` | `string` | 是 |  | minLength=1 |
| `payload` | `object` | 否 |  |  |

### `DevTaskEventPublic`

- Type：`object`
- Required：`id`, `task_id`, `to_status`, `event_type`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `integer` | 是 |  |  |
| `task_id` | `string` | 是 |  |  |
| `from_status` | `anyOf(string, null)` | 否 |  |  |
| `to_status` | `string` | 是 |  |  |
| `event_type` | `string` | 是 |  |  |
| `message` | `anyOf(string, null)` | 否 |  |  |
| `error_detail` | `anyOf(string, null)` | 否 |  |  |
| `operator_id` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `DevTaskEventsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`DevTaskEventPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `DevTaskPublic`

- Type：`object`
- Required：`task_id`, `tenant_id`, `created_by`, `markdown`, `status`, `retry_count`, `qa_retry_count`, `payload`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 |  |  |
| `tenant_id` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string, null)` | 否 |  |  |
| `created_by` | `string` | 是 |  |  |
| `markdown` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `current_node` | `anyOf(string, null)` | 否 |  |  |
| `current_stage` | `anyOf(string, null)` | 否 |  |  |
| `retry_count` | `integer` | 是 |  |  |
| `qa_retry_count` | `integer` | 是 |  |  |
| `last_error` | `anyOf(string, null)` | 否 |  |  |
| `payload` | `object` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `DevTaskResume`

- Type：`object`
- Required：`target_state`, `operator_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `target_state` | ``TaskStatus`` | 是 |  |  |
| `operator_id` | `string` | 是 |  | minLength=1; maxLength=64 |
| `reason` | `anyOf(string, null)` | 否 |  |  |
| `payload` | `object` | 否 |  |  |

### `DevTasksPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`DevTaskPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `DevTaskSummary`

- Type：`object`
- Required：`task_id`, `status`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |

### `FileUploadPublic`

- Type：`object`
- Required：`bucket`, `object_name`, `url`, `size`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `bucket` | `string` | 是 |  |  |
| `object_name` | `string` | 是 |  |  |
| `url` | `string` | 是 |  |  |
| `content_type` | `anyOf(string, null)` | 否 |  |  |
| `size` | `integer` | 是 |  |  |

### `GrcAuditEventPublic`

- Type：`object`
- Required：`id`, `aggregate_type`, `aggregate_id`, `event_type`, `actor_type`, `actor_id`, `action`, `outcome`, `event_metadata`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `integer` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `aggregate_type` | `string` | 是 |  |  |
| `aggregate_id` | `string` | 是 |  |  |
| `event_type` | `string` | 是 |  |  |
| `actor_type` | `string` | 是 |  |  |
| `actor_id` | `string` | 是 |  |  |
| `action` | `string` | 是 |  |  |
| `outcome` | `string` | 是 |  |  |
| `event_metadata` | `object` | 是 |  |  |
| `request_id` | `anyOf(string, null)` | 否 |  |  |
| `trace_id` | `anyOf(string, null)` | 否 |  |  |
| `source_ip` | `anyOf(string, null)` | 否 |  |  |
| `user_agent` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `related_evaluation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `related_decision_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `related_exception_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `related_treatment_id` | `anyOf(string (uuid), null)` | 否 |  |  |

### `GrcDashboardOverview`

- Type：`object`
- Required：`total_agents`, `risk_distribution`, `evaluations_total`, `evaluations_passed`, `evaluations_blocked`, `evaluations_error`, `reviews_open`, `reviews_overdue`, `avg_review_seconds`, `active_exceptions`, `expiring_soon_exceptions`, `overdue_treatments`, `top_failing_rules`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `total_agents` | `integer` | 是 |  |  |
| `risk_distribution` | `object` | 是 |  |  |
| `evaluations_total` | `integer` | 是 |  |  |
| `evaluations_passed` | `integer` | 是 |  |  |
| `evaluations_blocked` | `integer` | 是 |  |  |
| `evaluations_error` | `integer` | 是 |  |  |
| `reviews_open` | `integer` | 是 |  |  |
| `reviews_overdue` | `integer` | 是 |  |  |
| `avg_review_seconds` | `anyOf(number, null)` | 是 |  |  |
| `active_exceptions` | `integer` | 是 |  |  |
| `expiring_soon_exceptions` | `integer` | 是 |  |  |
| `overdue_treatments` | `integer` | 是 |  |  |
| `top_failing_rules` | `array<object>` | 是 |  |  |

### `GrcEvaluationPublic`

- Type：`object`
- Required：`id`, `agent_id`, `trigger_type`, `profile_id`, `profile_version`, `result`, `risk_level`, `risk_score`, `input_sha256`, `rule_set_sha256`, `started_at`, `created_by`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `agent_id` | `string` | 是 |  |  |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `trigger_type` | `string` | 是 |  |  |
| `trigger_id` | `anyOf(string, null)` | 否 |  |  |
| `profile_id` | `string (uuid)` | 是 |  |  |
| `profile_version` | `integer` | 是 |  |  |
| `result` | `string` | 是 |  |  |
| `risk_level` | `string` | 是 |  |  |
| `risk_score` | `integer` | 是 |  |  |
| `input_sha256` | `string` | 是 |  |  |
| `rule_set_sha256` | `string` | 是 |  |  |
| `started_at` | `string (date-time)` | 是 |  |  |
| `completed_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `expires_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `created_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `agent_version` | `anyOf(string, null)` | 否 |  |  |

### `GrcExceptionPublic`

- Type：`object`
- Required：`id`, `exception_no`, `review_case_id`, `rule_id`, `rule_version_id`, `scope`, `justification`, `compensating_controls`, `requested_by`, `status`, `expires_at`, `used_count`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `exception_no` | `string` | 是 |  |  |
| `review_case_id` | `string (uuid)` | 是 |  |  |
| `rule_id` | `string (uuid)` | 是 |  |  |
| `rule_version_id` | `string (uuid)` | 是 |  |  |
| `scope` | `object` | 是 |  |  |
| `justification` | `string` | 是 |  |  |
| `compensating_controls` | `object` | 是 |  |  |
| `requested_by` | `string (uuid)` | 是 |  |  |
| `approved_by` | `anyOf(string (uuid), null)` | 否 |  |  |
| `status` | `string` | 是 |  |  |
| `starts_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `expires_at` | `string (date-time)` | 是 |  |  |
| `max_uses` | `anyOf(integer, null)` | 否 |  |  |
| `used_count` | `integer` | 是 |  |  |
| `revoked_by` | `anyOf(string (uuid), null)` | 否 |  |  |
| `revoked_reason` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `GrcPostDeployMonitorPublic`

- Type：`object`
- Required：`id`, `agent_id`, `status`, `anomaly_detected`, `anomaly_details`, `check_interval_minutes`, `created_by`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `agent_id` | `string` | 是 |  |  |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `agent_version` | `anyOf(string, null)` | 否 |  |  |
| `status` | `string` | 是 |  |  |
| `last_evaluation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `last_risk_score` | `anyOf(integer, null)` | 否 |  |  |
| `last_risk_level` | `anyOf(string, null)` | 否 |  |  |
| `anomaly_detected` | `boolean` | 是 |  |  |
| `anomaly_details` | `object` | 是 |  |  |
| `check_interval_minutes` | `integer` | 是 |  |  |
| `next_check_at` | `anyOf(string, null)` | 否 |  |  |
| `last_checked_at` | `anyOf(string, null)` | 否 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `created_at` | `string` | 是 |  |  |
| `updated_at` | `string` | 是 |  |  |

### `GrcReviewCasePublic`

- Type：`object`
- Required：`id`, `case_no`, `subject_type`, `subject_id`, `evaluation_id`, `status`, `risk_level`, `risk_score`, `title`, `summary`, `requester_id`, `version`, `opened_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `case_no` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `subject_type` | `string` | 是 |  |  |
| `subject_id` | `string` | 是 |  |  |
| `agent_id` | `anyOf(string, null)` | 否 |  |  |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `evaluation_id` | `string (uuid)` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `risk_level` | `string` | 是 |  |  |
| `risk_score` | `integer` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `summary` | `string` | 是 |  |  |
| `requester_id` | `string (uuid)` | 是 |  |  |
| `assignee_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `due_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `version` | `integer` | 是 |  |  |
| `opened_at` | `string (date-time)` | 是 |  |  |
| `decided_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `closed_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `agent_version` | `anyOf(string, null)` | 否 |  |  |
| `deployment_id` | `anyOf(string, null)` | 否 |  |  |
| `requester` | `anyOf(`GrcUserRef`, null)` | 否 |  |  |
| `assignee` | `anyOf(`GrcUserRef`, null)` | 否 |  |  |

### `GrcReviewDecisionPublic`

- Type：`object`
- Required：`id`, `review_case_id`, `decision`, `rationale`, `conditions`, `evidence_refs`, `evaluation_snapshot`, `rule_results_snapshot`, `decided_by`, `decided_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `review_case_id` | `string (uuid)` | 是 |  |  |
| `decision` | `string` | 是 |  |  |
| `rationale` | `string` | 是 |  |  |
| `conditions` | `array<object>` | 是 |  |  |
| `evidence_refs` | `object` | 是 |  |  |
| `evaluation_snapshot` | `object` | 是 |  |  |
| `rule_results_snapshot` | `object` | 是 |  |  |
| `decided_by` | `string (uuid)` | 是 |  |  |
| `decided_at` | `string (date-time)` | 是 |  |  |
| `request_id` | `anyOf(string, null)` | 否 |  |  |
| `source_ip` | `anyOf(string, null)` | 否 |  |  |
| `user_agent` | `anyOf(string, null)` | 否 |  |  |
| `agent_version` | `anyOf(string, null)` | 否 |  |  |
| `decided_by_user` | `anyOf(`GrcUserRef`, null)` | 否 |  |  |

### `GrcRiskProfileCreate`

- Type：`object`
- Required：`agent_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `source_task_id` | `anyOf(string, null)` | 否 |  |  |
| `data_classification` | `string` | 否 |  | default=internal |
| `autonomy_level` | `string` | 否 |  | default=assistive |
| `exposure` | `string` | 否 |  | default=internal |
| `capabilities` | `object` | 否 |  |  |
| `owners` | `object` | 否 |  |  |
| `assessment_source` | `string` | 否 |  | default=auto |

### `GrcRiskProfilePublic`

- Type：`object`
- Required：`id`, `agent_id`, `risk_level`, `risk_score`, `data_classification`, `autonomy_level`, `exposure`, `capabilities`, `owners`, `profile_version`, `assessment_source`, `status`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `agent_id` | `string` | 是 |  |  |
| `source_task_id` | `anyOf(string, null)` | 否 |  |  |
| `risk_level` | `string` | 是 |  |  |
| `risk_score` | `integer` | 是 |  |  |
| `data_classification` | `string` | 是 |  |  |
| `autonomy_level` | `string` | 是 |  |  |
| `exposure` | `string` | 是 |  |  |
| `capabilities` | `object` | 是 |  |  |
| `owners` | `object` | 是 |  |  |
| `owner_user_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `profile_version` | `integer` | 是 |  |  |
| `assessment_source` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `GrcRiskProfileUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `risk_level` | `anyOf(string, null)` | 否 |  |  |
| `risk_score` | `anyOf(integer, null)` | 否 |  |  |
| `data_classification` | `anyOf(string, null)` | 否 |  |  |
| `autonomy_level` | `anyOf(string, null)` | 否 |  |  |
| `exposure` | `anyOf(string, null)` | 否 |  |  |
| `capabilities` | `anyOf(object, null)` | 否 |  |  |
| `owners` | `anyOf(object, null)` | 否 |  |  |
| `status` | `anyOf(string, null)` | 否 |  |  |

### `GrcRiskTreatmentPublic`

- Type：`object`
- Required：`id`, `review_case_id`, `treatment_type`, `action_plan`, `owner_id`, `status`, `verification_evidence`, `created_by`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `review_case_id` | `string (uuid)` | 是 |  |  |
| `evaluation_result_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `treatment_type` | `string` | 是 |  |  |
| `action_plan` | `string` | 是 |  |  |
| `owner_id` | `string (uuid)` | 是 |  |  |
| `due_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `status` | `string` | 是 |  |  |
| `verification_evidence` | `object` | 是 |  |  |
| `verified_by` | `anyOf(string (uuid), null)` | 否 |  |  |
| `verified_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `residual_risk_level` | `anyOf(string, null)` | 否 |  |  |
| `residual_risk_score` | `anyOf(integer, null)` | 否 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `GrcRuleCreate`

- Type：`object`
- Required：`code`, `name`, `category`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `category` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `initial_version` | `anyOf(`GrcRuleVersionCreate`, null)` | 否 |  |  |

### `GrcRulePublic`

- Type：`object`
- Required：`id`, `code`, `name`, `category`, `is_active`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `code` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `category` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `owner_user_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `is_active` | `boolean` | 是 |  |  |
| `current_version` | `anyOf(integer, null)` | 否 |  |  |
| `current_severity` | `anyOf(string, null)` | 否 |  |  |
| `current_status` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `GrcRuleUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `is_active` | `anyOf(boolean, null)` | 否 |  |  |

### `GrcRuleVersionCreate`

- Type：`object`
- Required：`version`, `severity`, `risk_score`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `version` | `integer` | 是 |  |  |
| `severity` | `string` | 是 |  |  |
| `risk_score` | `integer` | 是 |  |  |
| `block_on_fail` | `boolean` | 否 |  | default=False |
| `exception_allowed` | `boolean` | 否 |  | default=True |
| `applicable_scope` | `object` | 否 |  |  |
| `evaluator_type` | `string` | 否 |  | default=builtin |
| `evaluator_config` | `object` | 否 |  |  |
| `evidence_requirements` | `object` | 否 |  |  |
| `remediation_template` | `anyOf(string, null)` | 否 |  |  |
| `effective_from` | `anyOf(string (date-time), null)` | 否 |  |  |
| `effective_to` | `anyOf(string (date-time), null)` | 否 |  |  |
| `change_note` | `string` | 否 |  | default= |

### `GrcRuleVersionPublic`

- Type：`object`
- Required：`id`, `rule_id`, `version`, `status`, `severity`, `risk_score`, `block_on_fail`, `exception_allowed`, `applicable_scope`, `evaluator_type`, `evaluator_config`, `evidence_requirements`, `change_note`, `created_by`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `rule_id` | `string (uuid)` | 是 |  |  |
| `version` | `integer` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `severity` | `string` | 是 |  |  |
| `risk_score` | `integer` | 是 |  |  |
| `block_on_fail` | `boolean` | 是 |  |  |
| `exception_allowed` | `boolean` | 是 |  |  |
| `applicable_scope` | `object` | 是 |  |  |
| `evaluator_type` | `string` | 是 |  |  |
| `evaluator_config` | `object` | 是 |  |  |
| `evidence_requirements` | `object` | 是 |  |  |
| `remediation_template` | `anyOf(string, null)` | 否 |  |  |
| `effective_from` | `anyOf(string (date-time), null)` | 否 |  |  |
| `effective_to` | `anyOf(string (date-time), null)` | 否 |  |  |
| `change_note` | `string` | 是 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `published_by` | `anyOf(string (uuid), null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `published_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `GrcRuleVersionPublish`

- Type：`object`
- Required：`change_note`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `change_note` | `string` | 是 |  |  |

### `GrcUserRef`

- Type：`object`
- Required：`id`, `email`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `email` | `string` | 是 |  |  |
| `full_name` | `anyOf(string, null)` | 否 |  |  |

### `HermesToolActor`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `user_id` | `anyOf(string, null)` | 否 |  |  |
| `tenant_id` | `anyOf(string, null)` | 否 |  |  |
| `email` | `anyOf(string, null)` | 否 |  |  |

### `HermesToolErrorPublic`

- Type：`object`
- Required：`code`, `message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  |  |
| `message` | `string` | 是 |  |  |
| `retryable` | `boolean` | 否 |  | default=False |
| `details` | `object` | 否 |  |  |

### `HermesToolRequest`

- Type：`object`
- Required：`tool_call_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `tool_call_id` | `string` | 是 |  | minLength=1; maxLength=128 |
| `idempotency_key` | `anyOf(string, null)` | 否 |  |  |
| `source` | `string` | 否 |  | default=hermes; maxLength=32 |
| `actor` | `anyOf(`HermesToolActor`, null)` | 否 |  |  |
| `conversation_id` | `anyOf(string, null)` | 否 |  |  |
| `chat_id` | `anyOf(string, null)` | 否 |  |  |
| `reason` | `anyOf(string, null)` | 否 |  |  |
| `payload` | `object` | 否 |  |  |

### `HermesToolResponse`

- Type：`object`
- Required：`ok`, `tool_call_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `ok` | `boolean` | 是 |  |  |
| `tool_call_id` | `string` | 是 |  |  |
| `result` | `object` | 否 |  |  |
| `events` | `array<object>` | 否 |  |  |
| `audit_id` | `anyOf(string, null)` | 否 |  |  |
| `error` | `anyOf(`HermesToolErrorPublic`, null)` | 否 |  |  |

### `HTTPValidationError`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `detail` | `array<`ValidationError`>` | 否 |  |  |

### `InstallationStatus`

- Type：`string (registered, pending, installing, installed, starting, enabled, healthy, unhealthy, disabled, upgrading, rolling_back, uninstalling…)`

- Enum：`registered`, `pending`, `installing`, `installed`, `starting`, `enabled`, `healthy`, `unhealthy`, `disabled`, `upgrading`, `rolling_back`, `uninstalling`, `uninstalled`, `failed`

### `ItemCreate`

- Type：`object`
- Required：`title`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `title` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |

### `ItemPublic`

- Type：`object`
- Required：`title`, `id`, `owner_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `title` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `id` | `string (uuid)` | 是 |  |  |
| `owner_id` | `string (uuid)` | 是 |  |  |
| `created_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `ItemsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`ItemPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `ItemUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `title` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |

### `KnowledgeSpec`

- Type：`object`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `enabled` | `boolean` | 否 |  | default=False |
| `dataset_ids` | `array<string>` | 否 |  |  |
| `top_k` | `integer` | 否 |  | default=5; minimum=1.0; maximum=50.0 |
| `query` | `anyOf(string, null)` | 否 |  |  |

### `LifecycleHotCandidatePublic`

- Type：`object`
- Required：`agent_id`, `name`, `tenant_id`, `daily_invocations`, `avg_duration_ms`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `tenant_id` | `string` | 是 |  |  |
| `daily_invocations` | `integer` | 是 |  |  |
| `avg_duration_ms` | `number` | 是 |  |  |
| `daily_avg_cost` | `number` | 否 |  | default=0 |

### `LifecycleHotCandidatesPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`LifecycleHotCandidatePublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `LifecycleIdleCandidatePublic`

- Type：`object`
- Required：`agent_id`, `name`, `tenant_id`, `idle_days`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `tenant_id` | `string` | 是 |  |  |
| `idle_days` | `integer` | 是 |  |  |
| `last_invoked_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `daily_avg_cost` | `number` | 否 |  | default=0 |

### `LifecycleIdleCandidatesPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`LifecycleIdleCandidatePublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `MenuPublic`

- Type：`object`
- Required：`code`, `title`, `app`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `title` | `string` | 是 |  | minLength=1; maxLength=255 |
| `app` | `string` | 是 |  | maxLength=32 |
| `path` | `anyOf(string, null)` | 否 |  |  |
| `parent_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `permission_code` | `anyOf(string, null)` | 否 |  |  |
| `icon` | `anyOf(string, null)` | 否 |  |  |
| `sort_order` | `integer` | 否 |  | default=0 |
| `is_visible` | `boolean` | 否 |  | default=True |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `children` | `array<`MenuPublic`>` | 否 |  |  |

### `Message`

- Type：`object`
- Required：`message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `message` | `string` | 是 |  |  |

### `NewPassword`

- Type：`object`
- Required：`token`, `new_password`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `token` | `string` | 是 |  |  |
| `new_password` | `string` | 是 |  | minLength=8; maxLength=128 |

### `OperationStatus`

- Type：`string (pending, running, succeeded, failed, rolling_back, rolled_back, cancelled)`

- Enum：`pending`, `running`, `succeeded`, `failed`, `rolling_back`, `rolled_back`, `cancelled`

### `OperationType`

- Type：`string (install, enable, disable, restart, upgrade, rollback, soft_uninstall, hard_uninstall, health_check, redeploy_resource, restart_resource, reload_routes)`

- Enum：`install`, `enable`, `disable`, `restart`, `upgrade`, `rollback`, `soft_uninstall`, `hard_uninstall`, `health_check`, `redeploy_resource`, `restart_resource`, `reload_routes`

### `OrganizationCreate`

- Type：`object`
- Required：`name`, `code`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `type` | `string` | 否 |  | default=tenant; maxLength=32 |
| `parent_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `status` | `string` | 否 |  | default=active; maxLength=32 |
| `sort_order` | `integer` | 否 |  | default=0 |

### `OrganizationPublic`

- Type：`object`
- Required：`name`, `code`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `type` | `string` | 否 |  | default=tenant; maxLength=32 |
| `parent_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `status` | `string` | 否 |  | default=active; maxLength=32 |
| `sort_order` | `integer` | 否 |  | default=0 |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `children` | `array<`OrganizationPublic`>` | 否 |  |  |

### `OrganizationsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`OrganizationPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `OrganizationUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `code` | `anyOf(string, null)` | 否 |  |  |
| `type` | `anyOf(string, null)` | 否 |  |  |
| `parent_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `status` | `anyOf(string, null)` | 否 |  |  |
| `sort_order` | `anyOf(integer, null)` | 否 |  |  |

### `PendingTaskConfirmationPublic`

- Type：`object`
- Required：`confirmation_id`, `title`, `task_type`, `markdown`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `confirmation_id` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `task_type` | `string` | 是 |  |  |
| `markdown` | `string` | 是 |  |  |

### `PermissionPublic`

- Type：`object`
- Required：`code`, `name`, `group`, `resource`, `action`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | minLength=1; maxLength=160 |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `group` | `string` | 是 |  | maxLength=64 |
| `resource` | `string` | 是 |  | maxLength=64 |
| `action` | `string` | 是 |  | maxLength=64 |
| `is_menu` | `boolean` | 否 |  | default=False |
| `is_api` | `boolean` | 否 |  | default=True |
| `is_active` | `boolean` | 否 |  | default=True |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `PermissionsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PermissionPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PlatformMetricsAgentSummaryPublic`

- Type：`object`
- Required：`total`, `running`, `sandbox`, `stopped`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `total` | `integer` | 是 |  |  |
| `running` | `integer` | 是 |  |  |
| `sandbox` | `integer` | 是 |  |  |
| `stopped` | `integer` | 是 |  |  |

### `PlatformMetricsBillingSummaryPublic`

- Type：`object`
- Required：`yesterday`, `this_week`, `this_month`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `yesterday` | `number` | 是 |  |  |
| `this_week` | `number` | 是 |  |  |
| `this_month` | `number` | 是 |  |  |

### `PlatformMetricsFactoryOutputPublic`

- Type：`object`
- Required：`total_tasks`, `by_status`, `success_rate`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `total_tasks` | `integer` | 是 |  |  |
| `by_status` | `object` | 是 |  |  |
| `success_rate` | `number` | 是 |  |  |

### `PlatformMetricsHotSkillPublic`

- Type：`object`
- Required：`rank`, `skill_id`, `name`, `category`, `call_count`, `success_rate`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `rank` | `integer` | 是 |  |  |
| `skill_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `category` | `string` | 是 |  |  |
| `call_count` | `integer` | 是 |  |  |
| `success_rate` | `number` | 是 |  |  |

### `PlatformMetricsLatencyPointPublic`

- Type：`object`
- Required：`hour`, `p50`, `p95`, `p99`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `hour` | `string` | 是 |  |  |
| `p50` | `number` | 是 |  |  |
| `p95` | `number` | 是 |  |  |
| `p99` | `number` | 是 |  |  |

### `PlatformMetricsLatencyPublic`

- Type：`object`
- Required：`unit`, `data`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `unit` | `string` | 是 |  |  |
| `data` | `array<`PlatformMetricsLatencyPointPublic`>` | 是 |  |  |

### `PlatformMetricsOverviewPublic`

- Type：`object`
- Required：`period`, `generated_at`, `factory_output`, `llm_latency`, `hot_skills`, `billing_summary`, `agent_summary`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `period` | `string` | 是 |  |  |
| `generated_at` | `string (date-time)` | 是 |  |  |
| `factory_output` | ``PlatformMetricsFactoryOutputPublic`` | 是 |  |  |
| `llm_latency` | ``PlatformMetricsLatencyPublic`` | 是 |  |  |
| `hot_skills` | `array<`PlatformMetricsHotSkillPublic`>` | 是 |  |  |
| `billing_summary` | ``PlatformMetricsBillingSummaryPublic`` | 是 |  |  |
| `agent_summary` | ``PlatformMetricsAgentSummaryPublic`` | 是 |  |  |

### `PluginAuditPublic`

- Type：`object`
- Required：`id`, `action`, `status`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `plugin_definition_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `installation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `runtime_resource_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `actor_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `action` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `trace_id` | `anyOf(string, null)` | 否 |  |  |
| `detail` | `object` | 否 |  |  |
| `error_code` | `anyOf(string, null)` | 否 |  |  |
| `error_message` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `PluginAuditsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginAuditPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginAuthDecisionPublic`

- Type：`object`
- Required：`allowed`, `plugin_id`, `installation_id`, `organization_id`, `user_id`, `trace_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `allowed` | `boolean` | 是 |  |  |
| `plugin_id` | `string` | 是 |  |  |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `user_id` | `string (uuid)` | 是 |  |  |
| `scopes` | `array<string>` | 否 |  |  |
| `trace_id` | `string` | 是 |  |  |
| `upstream_url` | `anyOf(string, null)` | 否 |  |  |
| `upstream_host_header` | `anyOf(string, null)` | 否 |  |  |

### `PluginAuthRequest`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `plugin_id` | `anyOf(string, null)` | 否 |  |  |
| `installation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `service_name` | `anyOf(string, null)` | 否 |  |  |
| `path` | `string` | 否 |  | default=/; maxLength=4096; pattern=^/ |
| `method` | `string` | 否 |  | default=GET; maxLength=16 |
| `trace_id` | `anyOf(string, null)` | 否 |  |  |

### `PluginBillingEventCreate`

- Type：`object`
- Required：`installation_id`, `resource_type`, `idempotency_key`, `operation`, `amount`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `resource_type` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9-]{0,31}$ |
| `idempotency_key` | `string` | 是 |  | minLength=8; maxLength=128 |
| `operation` | `string` | 是 |  | minLength=1; maxLength=128 |
| `amount` | `number` | 是 |  | exclusiveMinimum=0.0 |
| `metadata` | `object` | 否 |  |  |

### `PluginBillingEventPublic`

- Type：`object`
- Required：`id`, `installation_id`, `billing_rule_id`, `idempotency_key`, `operation`, `amount`, `cost`, `event_metadata`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `billing_rule_id` | `string (uuid)` | 是 |  |  |
| `idempotency_key` | `string` | 是 |  |  |
| `operation` | `string` | 是 |  |  |
| `amount` | `number` | 是 |  |  |
| `cost` | `number` | 是 |  |  |
| `event_metadata` | `object` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `PluginBillingRuleDeclaration`

- Type：`object`
- Required：`resource_type`, `unit`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `resource_type` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9-]{0,31}$ |
| `unit` | `string` | 是 |  | minLength=1; maxLength=32 |
| `unit_price` | `number` | 否 |  | default=0; minimum=0.0 |
| `currency` | `string` | 否 |  | default=CNY; maxLength=8; pattern=^[A-Z]{3,8}$ |

### `PluginCallbackEventCreate`

- Type：`object`
- Required：`instance_id`, `event`, `idempotency_key`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `instance_id` | `string` | 是 |  | minLength=3; maxLength=64 |
| `event` | `string` | 是 |  | maxLength=128; pattern=^[a-z][a-z0-9_.-]{1,127}$ |
| `idempotency_key` | `string` | 是 |  | minLength=8; maxLength=128 |
| `payload` | `object` | 否 |  |  |
| `billing_resource_type` | `anyOf(string, null)` | 否 |  |  |
| `billing_amount` | `anyOf(number, null)` | 否 |  |  |

### `PluginCallbackEventPublic`

- Type：`object`
- Required：`accepted`, `audit_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `accepted` | `boolean` | 是 |  |  |
| `audit_id` | `string (uuid)` | 是 |  |  |
| `billing_event_id` | `anyOf(string (uuid), null)` | 否 |  |  |

### `PluginCatalogItemPublic`

- Type：`object`
- Required：`plugin_id`, `installation_id`, `organization_id`, `name`, `source_type`, `version`, `status`, `entry_path`, `is_favorite`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `plugin_id` | `string` | 是 |  |  |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `source_type` | `string` | 是 |  |  |
| `version` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `icon` | `anyOf(string, null)` | 否 |  |  |
| `entry_path` | `string` | 是 |  |  |
| `is_favorite` | `boolean` | 是 |  |  |

### `PluginCatalogPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginCatalogItemPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginConfigPublic`

- Type：`object`
- Required：`installation_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `values` | `object` | 否 |  |  |
| `secret_keys` | `array<string>` | 否 |  |  |
| `updated_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `PluginConfigUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `values` | `object` | 否 |  |  |
| `secrets` | `object` | 否 |  |  |
| `apply_to_runtime` | `boolean` | 否 |  | default=True |

### `PluginDefinitionDeletePublic`

- Type：`object`
- Required：`plugin_id`, `deleted_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `plugin_id` | `string` | 是 |  |  |
| `deleted` | `boolean` | 否 |  | default=True |
| `deleted_at` | `string (date-time)` | 是 |  |  |

### `PluginDefinitionDetail`

- Type：`object`
- Required：`id`, `plugin_id`, `name`, `description`, `status`, `manifest`, `created_by`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `plugin_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `source_type` | `string` | 否 |  | default=oci |
| `is_official` | `boolean` | 否 |  | default=False |
| `version_count` | `integer` | 否 |  | default=0 |
| `installation_count` | `integer` | 否 |  | default=0 |
| `healthy_installation_count` | `integer` | 否 |  | default=0 |
| `failed_installation_count` | `integer` | 否 |  | default=0 |
| `install_in_progress` | `boolean` | 否 |  | default=False |
| `install_block_reason` | `anyOf(string, null)` | 否 |  |  |
| `can_delete` | `boolean` | 否 |  | default=False |
| `delete_block_reason` | `anyOf(string, null)` | 否 |  |  |
| `manifest` | ``PluginManifest-Output`` | 是 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `versions` | `array<`PluginVersionPublic`>` | 否 |  |  |

### `PluginDefinitionPublic`

- Type：`object`
- Required：`id`, `plugin_id`, `name`, `description`, `status`, `manifest`, `created_by`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `plugin_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `source_type` | `string` | 否 |  | default=oci |
| `is_official` | `boolean` | 否 |  | default=False |
| `version_count` | `integer` | 否 |  | default=0 |
| `installation_count` | `integer` | 否 |  | default=0 |
| `healthy_installation_count` | `integer` | 否 |  | default=0 |
| `failed_installation_count` | `integer` | 否 |  | default=0 |
| `install_in_progress` | `boolean` | 否 |  | default=False |
| `install_block_reason` | `anyOf(string, null)` | 否 |  |  |
| `can_delete` | `boolean` | 否 |  | default=False |
| `delete_block_reason` | `anyOf(string, null)` | 否 |  |  |
| `manifest` | ``PluginManifest-Output`` | 是 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `PluginDefinitionsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginDefinitionPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginDefinitionUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |

### `PluginDelivery`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `type` | `string (oci_image, source_repository, builtin)` | 否 |  | default=oci_image |
| `repository_url` | `anyOf(string, null)` | 否 |  |  |
| `ref` | `anyOf(string, null)` | 否 |  |  |
| `dockerfile` | `string` | 否 |  | default=Dockerfile; maxLength=255 |

### `PluginHardUninstallRequest`

- Type：`object`
- Required：`installation_id`, `confirm_instance_id`, `backup_acknowledged`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `execute_async` | `boolean` | 否 |  | default=True |
| `confirm_instance_id` | `string` | 是 |  | minLength=3; maxLength=64 |
| `backup_acknowledged` | `boolean` | 是 |  |  |
| `backup_manifest` | `object` | 否 |  |  |

### `PluginHealthCheckPublic`

- Type：`object`
- Required：`installation_id`, `status`, `services`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `status` | `anyOf(`InstallationStatus`, string)` | 是 |  |  |
| `services` | `array<`PluginServiceHealthPublic`>` | 是 |  |  |

### `PluginInstallationCreate`

- Type：`object`
- Required：`organization_id`, `version`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `version` | `string` | 是 |  | maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |
| `runtime_app_name` | `anyOf(string, null)` | 否 | Optional explicit runtime namespace. When omitted, the platform selects the next available generated name, starting with plugin-{plugin_id}-{organization}-web and then -v2, -v3, and so on. |  |
| `config` | `object` | 否 |  |  |
| `secrets` | `object` | 否 | Write-only secret values. Responses only expose configured keys. |  |

### `PluginInstallationOperationPublic`

- Type：`object`
- Required：`installation`, `operation`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation` | ``PluginInstallationPublic`` | 是 |  |  |
| `operation` | ``PluginOperationPublic`` | 是 |  |  |

### `PluginInstallationPublic`

- Type：`object`
- Required：`id`, `organization_id`, `plugin_definition_id`, `plugin_version_id`, `instance_id`, `runtime_app_name`, `status`, `installed_by`, `installed_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `plugin_definition_id` | `string (uuid)` | 是 |  |  |
| `plugin_version_id` | `string (uuid)` | 是 |  |  |
| `previous_plugin_version_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `instance_id` | `string` | 是 |  |  |
| `runtime_app_name` | `string` | 是 |  |  |
| `status` | `anyOf(`InstallationStatus`, string)` | 是 |  |  |
| `desired_status` | `string` | 否 |  | default=running |
| `last_error` | `anyOf(object, null)` | 否 |  |  |
| `installed_by` | `string (uuid)` | 是 |  |  |
| `installed_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `enabled_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `disabled_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `uninstalled_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `purged_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `PluginInstallationsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginInstallationPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginInstallPreflightCheck`

- Type：`object`
- Required：`code`, `label`, `status`, `message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  |  |
| `label` | `string` | 是 |  |  |
| `status` | `string (passed, warning, failed)` | 是 |  |  |
| `message` | `string` | 是 |  |  |

### `PluginInstallPreflightPublic`

- Type：`object`
- Required：`plugin_id`, `organization_id`, `version`, `runtime_app_name`, `ready`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `plugin_id` | `string` | 是 |  |  |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `version` | `string` | 是 |  |  |
| `runtime_app_name` | `string` | 是 |  |  |
| `ready` | `boolean` | 是 |  |  |
| `checks` | `array<`PluginInstallPreflightCheck`>` | 否 |  |  |
| `compatibility` | `object` | 否 |  |  |

### `PluginInstallRequest`

- Type：`object`
- Required：`organization_id`, `version`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `version` | `string` | 是 |  | maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |
| `runtime_app_name` | `anyOf(string, null)` | 否 | Optional explicit runtime namespace. When omitted, the platform selects the next available generated name, starting with plugin-{plugin_id}-{organization}-web and then -v2, -v3, and so on. |  |
| `config` | `object` | 否 |  |  |
| `secrets` | `object` | 否 | Write-only secret values. Responses only expose configured keys. |  |
| `execute_async` | `boolean` | 否 | Queue the durable operation. False executes inline for controlled maintenance. | default=True |

### `PluginLifecycleRequest`

- Type：`object`
- Required：`installation_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `execute_async` | `boolean` | 否 |  | default=True |

### `PluginLogsPublic`

- Type：`object`
- Required：`installation_id`, `resource_name`, `runtime_name`, `lines`, `content`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `resource_name` | `string` | 是 |  |  |
| `runtime_name` | `string` | 是 |  |  |
| `lines` | `integer` | 是 |  |  |
| `content` | `string` | 是 |  |  |

### `PluginManifest-Input`

- Type：`object`
- Required：`plugin_id`, `name`, `version`, `delivery`, `services`, `runtime`, `uninstall_policy`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 否 |  | default=1.0 |
| `plugin_id` | `string` | 是 |  | maxLength=32; pattern=^[a-z][a-z0-9-]{1,31}$ |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `version` | `string` | 是 |  | maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |
| `delivery` | ``PluginDelivery`` | 是 |  |  |
| `services` | ``PluginServices`` | 是 |  |  |
| `runtime` | ``PluginRuntime-Input`` | 是 |  |  |
| `uninstall_policy` | `string (soft_only, soft_then_hard, hard_allowed)` | 是 |  |  |
| `menus` | `array<`PluginMenuDeclaration`>` | 否 |  |  |
| `permissions` | `array<`PluginPermissionDeclaration`>` | 否 |  |  |
| `tenant_config_schema` | `object` | 否 |  |  |
| `secrets` | `array<`PluginSecretDeclaration`>` | 否 |  |  |
| `volumes` | `array<object>` | 否 |  |  |
| `billing` | `array<`PluginBillingRuleDeclaration`>` | 否 |  |  |
| `events` | `array<string>` | 否 |  |  |
| `tools` | `array<`PluginToolDeclaration`>` | 否 |  |  |
| `compatibility` | `object` | 否 |  |  |

### `PluginManifest-Output`

- Type：`object`
- Required：`plugin_id`, `name`, `version`, `delivery`, `services`, `runtime`, `uninstall_policy`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 否 |  | default=1.0 |
| `plugin_id` | `string` | 是 |  | maxLength=32; pattern=^[a-z][a-z0-9-]{1,31}$ |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `version` | `string` | 是 |  | maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |
| `delivery` | ``PluginDelivery`` | 是 |  |  |
| `services` | ``PluginServices`` | 是 |  |  |
| `runtime` | ``PluginRuntime-Output`` | 是 |  |  |
| `uninstall_policy` | `string (soft_only, soft_then_hard, hard_allowed)` | 是 |  |  |
| `menus` | `array<`PluginMenuDeclaration`>` | 否 |  |  |
| `permissions` | `array<`PluginPermissionDeclaration`>` | 否 |  |  |
| `tenant_config_schema` | `object` | 否 |  |  |
| `secrets` | `array<`PluginSecretDeclaration`>` | 否 |  |  |
| `volumes` | `array<object>` | 否 |  |  |
| `billing` | `array<`PluginBillingRuleDeclaration`>` | 否 |  |  |
| `events` | `array<string>` | 否 |  |  |
| `tools` | `array<`PluginToolDeclaration`>` | 否 |  |  |
| `compatibility` | `object` | 否 |  |  |

### `PluginManifestValidationIssue`

- Type：`object`
- Required：`message`, `type`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `location` | `array<string>` | 否 |  |  |
| `message` | `string` | 是 |  |  |
| `type` | `string` | 是 |  |  |

### `PluginManifestValidationRequest`

- Type：`object`
- Required：`manifest`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `manifest` | `object` | 是 |  |  |

### `PluginManifestValidationResponse`

- Type：`object`
- Required：`valid`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `valid` | `boolean` | 是 |  |  |
| `manifest` | `anyOf(`PluginManifest-Output`, null)` | 否 |  |  |
| `errors` | `array<`PluginManifestValidationIssue`>` | 否 |  |  |

### `PluginMenuDeclaration`

- Type：`object`
- Required：`code`, `title`, `path`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | maxLength=128; pattern=^[a-z][a-z0-9_.-]{1,127}$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=255 |
| `path` | `string` | 是 |  | maxLength=1024; pattern=^/ |
| `service` | `string` | 否 |  | default=ui; maxLength=64; pattern=^[a-z][a-z0-9-]{0,63}$ |
| `required_scope` | `anyOf(string, null)` | 否 |  |  |
| `icon` | `anyOf(string, null)` | 否 |  |  |
| `order` | `integer` | 否 |  | default=0; minimum=0.0; maximum=10000.0 |

### `PluginMenuPublic`

- Type：`object`
- Required：`plugin_id`, `installation_id`, `code`, `title`, `path`, `service`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `plugin_id` | `string` | 是 |  |  |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `code` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `path` | `string` | 是 |  |  |
| `service` | `string` | 是 |  |  |
| `required_scope` | `anyOf(string, null)` | 否 |  |  |
| `icon` | `anyOf(string, null)` | 否 |  |  |
| `order` | `integer` | 否 |  | default=0 |

### `PluginMenusPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginMenuPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginMetricsPublic`

- Type：`object`
- Required：`definitions`, `recent_failures`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `definitions` | `integer` | 是 |  |  |
| `installations_by_status` | `object` | 否 |  |  |
| `resources_by_status` | `object` | 否 |  |  |
| `services_by_status` | `object` | 否 |  |  |
| `operations_by_status` | `object` | 否 |  |  |
| `recent_failures` | `integer` | 是 |  |  |

### `PluginNginxReloadPublic`

- Type：`object`
- Required：`revision`, `route_count`, `reloaded`, `message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `revision` | `string` | 是 |  |  |
| `route_count` | `integer` | 是 |  |  |
| `config_path` | `anyOf(string, null)` | 否 |  |  |
| `reloaded` | `boolean` | 是 |  |  |
| `message` | `string` | 是 |  |  |

### `PluginOperationPublic`

- Type：`object`
- Required：`id`, `installation_id`, `operation`, `status`, `requested_by`, `attempt_count`, `max_attempts`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `trace_id` | `string` | 否 |  | default= |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `operation` | `anyOf(`OperationType`, string)` | 是 |  |  |
| `status` | `anyOf(`OperationStatus`, string)` | 是 |  |  |
| `target_plugin_version_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `resource_name` | `anyOf(string, null)` | 否 |  |  |
| `requested_by` | `string (uuid)` | 是 |  |  |
| `steps` | `array<object>` | 否 |  |  |
| `current_step` | `anyOf(string, null)` | 否 |  |  |
| `attempt_count` | `integer` | 是 |  |  |
| `max_attempts` | `integer` | 是 |  |  |
| `last_error` | `anyOf(object, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `started_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `completed_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `PluginOperationsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginOperationPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginPermissionDeclaration`

- Type：`object`
- Required：`code`, `name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | maxLength=160; pattern=^[a-z][a-z0-9_.-]{1,63}(?::[a-z0-9_.-]{1,64}){1,4}$ |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `type` | `string (install, manage, access, operation)` | 否 |  | default=access |
| `service` | `anyOf(string, null)` | 否 |  |  |
| `path_pattern` | `anyOf(string, null)` | 否 |  |  |
| `methods` | `array<string>` | 否 |  | maxItems=16 |

### `PluginPermissionPublic`

- Type：`object`
- Required：`id`, `plugin_definition_id`, `code`, `name`, `permission_type`, `is_active`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `plugin_definition_id` | `string (uuid)` | 是 |  |  |
| `code` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `permission_type` | `string` | 是 |  |  |
| `service_name` | `anyOf(string, null)` | 否 |  |  |
| `path_pattern` | `anyOf(string, null)` | 否 |  |  |
| `methods` | `array<string>` | 否 |  |  |
| `is_active` | `boolean` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `PluginPermissionsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginPermissionPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginRegistrationCreate`

- Type：`object`
- Required：`manifest`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `manifest` | ``PluginManifest-Input`` | 是 |  |  |
| `image` | `anyOf(string, null)` | 否 |  |  |
| `image_digest` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |

### `PluginResourceLimits`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `cpu` | `anyOf(number, null)` | 否 |  |  |
| `memory_mb` | `anyOf(integer, null)` | 否 |  |  |
| `disk_mb` | `anyOf(integer, null)` | 否 |  |  |

### `PluginRolePermissionPublic`

- Type：`object`
- Required：`role_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `role_id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `permission_codes` | `array<string>` | 否 |  |  |

### `PluginRolePermissionUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `permission_codes` | `array<string>` | 否 |  | maxItems=500 |

### `PluginRoutePublic`

- Type：`object`
- Required：`id`, `installation_id`, `service_registration_id`, `route_type`, `path_prefix`, `upstream_url`, `auth_required`, `status`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `service_registration_id` | `string (uuid)` | 是 |  |  |
| `route_type` | `string` | 是 |  |  |
| `path_prefix` | `string` | 是 |  |  |
| `upstream_url` | `string` | 是 |  |  |
| `upstream_host_header` | `anyOf(string, null)` | 否 |  |  |
| `auth_required` | `boolean` | 是 |  |  |
| `required_scope` | `anyOf(string, null)` | 否 |  |  |
| `status` | `anyOf(`RouteStatus`, string)` | 是 |  |  |
| `active_version` | `anyOf(string, null)` | 否 |  |  |
| `candidate_version` | `anyOf(string, null)` | 否 |  |  |
| `resource_name` | `anyOf(string, null)` | 否 |  |  |
| `config_revision` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `PluginRoutesPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginRoutePublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginRuntime-Input`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `type` | `string (single_app, multi_resource)` | 否 |  | default=single_app |
| `port` | `integer` | 否 |  | default=8080; minimum=1.0; maximum=65535.0 |
| `resources` | `array<`PluginRuntimeResourceManifest`>` | 否 |  |  |

### `PluginRuntime-Output`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `type` | `string (single_app, multi_resource)` | 否 |  | default=single_app |
| `port` | `integer` | 否 |  | default=8080; minimum=1.0; maximum=65535.0 |
| `resources` | `array<`PluginRuntimeResourceManifest`>` | 否 |  |  |

### `PluginRuntimeProxyResponse`

- Type：`object`
- Required：`enabled`, `status`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `enabled` | `boolean` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `runtime` | `anyOf(object, null)` | 否 |  |  |

### `PluginRuntimeResourceManifest`

- Type：`object`
- Required：`name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | maxLength=32; pattern=^[a-z][a-z0-9-]{0,31}$ |
| `type` | `string (app, service, external)` | 否 |  | default=app |
| `management` | `string (managed, external)` | 否 |  | default=managed |
| `role` | `string` | 否 |  | default=api; maxLength=32; pattern=^[a-z][a-z0-9-]{0,31}$ |
| `dependency_order` | `integer` | 否 |  | default=0; minimum=0.0; maximum=1000.0 |
| `depends_on` | `array<string>` | 否 |  | maxItems=32 |
| `image` | `anyOf(string, null)` | 否 |  |  |
| `image_digest` | `anyOf(string, null)` | 否 |  |  |
| `port` | `anyOf(integer, null)` | 否 |  |  |
| `upstream_url` | `anyOf(string, null)` | 否 |  |  |
| `browser_url` | `anyOf(string, null)` | 否 |  |  |
| `service_type` | `anyOf(string (postgres, redis), null)` | 否 |  |  |
| `service_plan` | `anyOf(string, null)` | 否 |  |  |
| `env` | `object` | 否 |  |  |
| `limits` | ``PluginResourceLimits`` | 否 |  |  |

### `PluginRuntimeResourcePublic`

- Type：`object`
- Required：`id`, `installation_id`, `resource_name`, `resource_type`, `resource_role`, `runtime_name`, `dependency_order`, `status`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `resource_name` | `string` | 是 |  |  |
| `resource_type` | `anyOf(string (app, service), string)` | 是 |  |  |
| `resource_role` | `string` | 是 |  |  |
| `runtime_name` | `string` | 是 |  |  |
| `management` | `string (managed, external)` | 否 |  | default=managed |
| `upstream_url` | `anyOf(string, null)` | 否 |  |  |
| `browser_url` | `anyOf(string, null)` | 否 |  |  |
| `service_type` | `anyOf(string, null)` | 否 |  |  |
| `service_plan` | `anyOf(string, null)` | 否 |  |  |
| `image` | `anyOf(string, null)` | 否 |  |  |
| `image_digest` | `anyOf(string, null)` | 否 |  |  |
| `previous_image` | `anyOf(string, null)` | 否 |  |  |
| `previous_image_digest` | `anyOf(string, null)` | 否 |  |  |
| `container_port` | `anyOf(integer, null)` | 否 |  |  |
| `dependency_order` | `integer` | 是 |  |  |
| `dependencies` | `array<string>` | 否 |  |  |
| `environment_keys` | `array<string>` | 否 |  |  |
| `resource_limits` | `object` | 否 |  |  |
| `status` | `anyOf(`ResourceStatus`, string)` | 是 |  |  |
| `runtime_metadata` | `object` | 否 |  |  |
| `last_error` | `anyOf(object, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `PluginRuntimeResourcesPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginRuntimeResourcePublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginRuntimeStatusPublic`

- Type：`object`
- Required：`installation_id`, `resources`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `resources` | `array<object>` | 是 |  |  |

### `PluginSecretDeclaration`

- Type：`object`
- Required：`key`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  | maxLength=128; pattern=^[A-Z][A-Z0-9_]{0,127}$ |
| `required` | `boolean` | 否 |  | default=False |
| `description` | `anyOf(string, null)` | 否 |  |  |

### `PluginServiceDeclaration`

- Type：`object`
- Required：`name`, `type`, `path`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9-]{0,63}$ |
| `type` | `string (api, ui, openapi, health, metrics, webhook)` | 是 |  |  |
| `resource` | `string` | 否 |  | default=web; maxLength=32; pattern=^[a-z][a-z0-9-]{0,31}$ |
| `path` | `string` | 是 |  | maxLength=1024; pattern=^/ |
| `public_path` | `anyOf(string, null)` | 否 |  |  |
| `health_path` | `anyOf(string, null)` | 否 |  |  |
| `openapi_path` | `anyOf(string, null)` | 否 |  |  |
| `required_scope` | `anyOf(string, null)` | 否 |  |  |
| `auth_required` | `boolean` | 否 |  | default=True |

### `PluginServiceHealthPublic`

- Type：`object`
- Required：`service_id`, `service_name`, `status`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service_id` | `string (uuid)` | 是 |  |  |
| `service_name` | `string` | 是 |  |  |
| `status` | `anyOf(`ServiceStatus`, string)` | 是 |  |  |
| `http_status` | `anyOf(integer, null)` | 否 |  |  |
| `latency_ms` | `anyOf(integer, null)` | 否 |  |  |
| `openapi_hash` | `anyOf(string, null)` | 否 |  |  |
| `error` | `anyOf(string, null)` | 否 |  |  |

### `PluginServicePublic`

- Type：`object`
- Required：`id`, `installation_id`, `service_name`, `service_type`, `upstream_url`, `public_path`, `version`, `status`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `runtime_resource_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `service_name` | `string` | 是 |  |  |
| `service_type` | `string` | 是 |  |  |
| `resource_role` | `anyOf(string, null)` | 否 |  |  |
| `dependency_group` | `anyOf(string, null)` | 否 |  |  |
| `upstream_url` | `string` | 是 |  |  |
| `upstream_host_header` | `anyOf(string, null)` | 否 |  |  |
| `public_path` | `string` | 是 |  |  |
| `health_url` | `anyOf(string, null)` | 否 |  |  |
| `openapi_url` | `anyOf(string, null)` | 否 |  |  |
| `version` | `string` | 是 |  |  |
| `status` | `anyOf(`ServiceStatus`, string)` | 是 |  |  |
| `openapi_hash` | `anyOf(string, null)` | 否 |  |  |
| `last_checked_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `last_error` | `anyOf(object, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `PluginServiceRegistrationCreate`

- Type：`object`
- Required：`installation_id`, `service_name`, `service_type`, `upstream_url`, `public_path`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `resource_name` | `anyOf(string, null)` | 否 |  |  |
| `service_name` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9-]{0,63}$ |
| `service_type` | `string (api, ui, openapi, health, metrics, webhook)` | 是 |  |  |
| `upstream_url` | `string` | 是 |  | minLength=1; maxLength=2048 |
| `upstream_host_header` | `anyOf(string, null)` | 否 |  |  |
| `public_path` | `string` | 是 |  | maxLength=1024; pattern=^/ |
| `health_url` | `anyOf(string, null)` | 否 |  |  |
| `openapi_url` | `anyOf(string, null)` | 否 |  |  |
| `required_scope` | `anyOf(string, null)` | 否 |  |  |
| `auth_required` | `boolean` | 否 |  | default=True |

### `PluginServices`

- Type：`object`
- Required：`ui`, `api`, `health`, `openapi`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `ui` | `string` | 是 |  | maxLength=512; pattern=^/ |
| `api` | `string` | 是 |  | maxLength=512; pattern=^/ |
| `health` | `string` | 是 |  | maxLength=512; pattern=^/ |
| `openapi` | `string` | 是 |  | maxLength=512; pattern=^/ |
| `registrations` | `array<`PluginServiceDeclaration`>` | 否 |  |  |

### `PluginServicesPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginServicePublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PluginToolDeclaration`

- Type：`object`
- Required：`key`, `name`, `service`, `path`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9_.-]{1,63}$ |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `service` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9-]{0,63}$ |
| `method` | `string (GET, HEAD, OPTIONS)` | 否 |  | default=GET |
| `path` | `string` | 是 |  | maxLength=1024; pattern=^/ |
| `input_schema` | `object` | 否 |  |  |
| `output_schema` | `object` | 否 |  |  |
| `required_scope` | `anyOf(string, null)` | 否 |  |  |
| `timeout_ms` | `integer` | 否 |  | default=3000; minimum=100.0; maximum=120000.0 |
| `read_only` | `boolean` | 否 |  | default=True |

### `PluginUiSessionPublic`

- Type：`object`
- Required：`url`, `expires_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `url` | `string` | 是 |  |  |
| `expires_at` | `string (date-time)` | 是 |  |  |
| `external` | `boolean` | 否 |  | default=False |

### `PluginUpgradeRequest`

- Type：`object`
- Required：`installation_id`, `version`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `installation_id` | `string (uuid)` | 是 |  |  |
| `execute_async` | `boolean` | 否 |  | default=True |
| `version` | `string` | 是 |  | maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |

### `PluginVerificationPublic`

- Type：`object`
- Required：`plugin_id`, `valid`, `version_count`, `verified_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `plugin_id` | `string` | 是 |  |  |
| `valid` | `boolean` | 是 |  |  |
| `version_count` | `integer` | 是 |  |  |
| `verified_versions` | `array<string>` | 否 |  |  |
| `checks` | `array<object>` | 否 |  |  |
| `installation_health` | `anyOf(`PluginHealthCheckPublic`, null)` | 否 |  |  |
| `verified_at` | `string (date-time)` | 是 |  |  |

### `PluginVersionCreate`

- Type：`object`
- Required：`manifest`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `manifest` | ``PluginManifest-Input`` | 是 |  |  |
| `image` | `anyOf(string, null)` | 否 |  |  |
| `image_digest` | `anyOf(string, null)` | 否 |  |  |

### `PluginVersionPublic`

- Type：`object`
- Required：`id`, `plugin_definition_id`, `version`, `image`, `image_digest`, `manifest`, `created_by`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `plugin_definition_id` | `string (uuid)` | 是 |  |  |
| `version` | `string` | 是 |  |  |
| `image` | `string` | 是 |  |  |
| `image_digest` | `anyOf(string, null)` | 是 |  |  |
| `openapi_hash` | `anyOf(string, null)` | 否 |  |  |
| `migration_status` | `string` | 否 |  | default=not_required |
| `resource_versions` | `object` | 否 |  |  |
| `manifest` | ``PluginManifest-Output`` | 是 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `verified_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `PluginVersionsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`PluginVersionPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `PptMasterArtifact`

- Type：`object`
- Required：`path`, `size_bytes`, `kind`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `path` | `string` | 是 | Artifact path relative to the PPT Master project root. |  |
| `size_bytes` | `integer` | 是 |  | minimum=0.0 |
| `kind` | `string` | 是 | File extension or artifact kind, for example pptx or svg. |  |

### `PptMasterCreateJobRequest`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `title` | `string` | 否 | Human-readable PPT job title. | default=PPT Master Deck; minLength=1; maxLength=160 |
| `canvas_format` | `string` | 否 | PPT Master canvas format, for example ppt169. | default=ppt169; minLength=1; maxLength=32 |

### `PptMasterExportRequest`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `source` | `string (output, final)` | 否 | SVG folder to export from: output maps to svg_output, final maps to svg_final. | default=output |
| `svg_snapshot` | `boolean` | 否 | Whether to request PPT Master SVG snapshot export mode. | default=False |

### `PptMasterJobPublic`

- Type：`object`
- Required：`job_id`, `title`, `canvas_format`, `project_path`, `status`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `job_id` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `canvas_format` | `string` | 是 |  |  |
| `project_path` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `created_at` | `string` | 是 |  |  |
| `updated_at` | `string` | 是 |  |  |
| `artifacts` | `array<`PptMasterArtifact`>` | 否 |  |  |
| `last_error` | `anyOf(string, null)` | 否 |  |  |

### `PptMasterMarkdownSourceRequest`

- Type：`object`
- Required：`content`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `filename` | `string` | 否 |  | default=source.md; minLength=1; maxLength=160 |
| `content` | `string` | 是 | Markdown or text source material. | minLength=1 |

### `PptMasterSvgSlideRequest`

- Type：`object`
- Required：`content`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `filename` | `string` | 否 |  | default=slide_001.svg; minLength=1; maxLength=160 |
| `content` | `string` | 是 | Complete SVG slide content. | minLength=1 |

### `PrimaryOrganizationPublic`

- Type：`object`
- Required：`id`, `name`, `code`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `code` | `string` | 是 |  |  |

### `ProductionApprovalCancel`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `rationale` | `string` | 否 |  | default= |

### `ProductionApprovalCreate`

- Type：`object`
- Required：`agent_id`, `idempotency_key`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  | maxLength=128 |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `idempotency_key` | `string` | 是 |  | maxLength=160 |
| `target_type` | `string` | 否 |  | default=agent; maxLength=20 |
| `workflow_app_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `workflow_version_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `catalog_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `requester_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `artifact_snapshot` | `object` | 否 |  |  |

### `ProductionApprovalDecisionCreate`

- Type：`object`
- Required：`decision`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `decision` | `string` | 是 |  | maxLength=16 |
| `rationale` | `string` | 否 |  | default= |
| `expected_version` | `integer` | 否 |  | default=1; minimum=1.0 |

### `ProductionApprovalDetailPublic`

- Type：`object`
- Required：`request`, `qa_result_snapshot`, `artifact_snapshot`, `approver_role_ids`, `approver_user_ids`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `request` | ``ProductionApprovalPublic`` | 是 |  |  |
| `qa_result_snapshot` | `object` | 是 |  |  |
| `artifact_snapshot` | `object` | 是 |  |  |
| `release_snapshot` | `object` | 否 |  |  |
| `runtime_snapshot` | `object` | 否 |  |  |
| `approver_role_ids` | `array<string>` | 是 |  |  |
| `approver_user_ids` | `array<string>` | 是 |  |  |
| `approver_users` | `array<`ApproverRefPublic`>` | 否 |  |  |
| `approver_roles` | `array<`ApproverRefPublic`>` | 否 |  |  |
| `decisions` | `array<object>` | 否 |  |  |

### `ProductionApprovalListPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`ProductionApprovalPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `ProductionApprovalPublic`

- Type：`object`
- Required：`id`, `approval_no`, `agent_id`, `deployment_version`, `deployment_sha256`, `qa_passed`, `risk_level`, `risk_score`, `status`, `approval_mode`, `requester_id`, `rationale`, `version`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `approval_no` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `target_type` | `string` | 否 |  | default=agent |
| `agent_id` | `string` | 是 |  |  |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `workflow_app_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `workflow_version_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `deployment_version` | `integer` | 是 |  |  |
| `deployment_sha256` | `string` | 是 |  |  |
| `qa_passed` | `boolean` | 是 |  |  |
| `evaluation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `risk_level` | `string` | 是 |  |  |
| `risk_score` | `integer` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `activation_status` | `string` | 否 |  | default=PENDING |
| `approval_mode` | `string` | 是 |  |  |
| `requester_id` | `string (uuid)` | 是 |  |  |
| `approved_by` | `anyOf(string (uuid), null)` | 否 |  |  |
| `rationale` | `string` | 是 |  |  |
| `version` | `integer` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `decided_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `approved_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `rejected_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `cancelled_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `available_actions` | `array<string>` | 否 |  |  |

### `ProductionRollbackCreate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `reason` | `string` | 否 |  | default= |

### `ProductionRollbackPublic`

- Type：`object`
- Required：`id`, `agent_id`, `task_id`, `deployment_version_before`, `reason`, `rolled_back_by`, `rolled_back_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `agent_id` | `string` | 是 |  |  |
| `task_id` | `string` | 是 |  |  |
| `approval_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `deployment_version_before` | `integer` | 是 |  |  |
| `reason` | `string` | 是 |  |  |
| `rolled_back_by` | `string (uuid)` | 是 |  |  |
| `rolled_back_at` | `string (date-time)` | 是 |  |  |

### `QuestionGenerationJobCreate`

- Type：`object`
- Required：`title`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `paper_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `title` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `question_count` | `integer` | 否 |  | default=20; minimum=1.0; maximum=100.0 |
| `question_types` | `array<string (single, multiple, true_false)>` | 否 |  |  |
| `difficulty` | `string (easy, medium, hard)` | 否 |  | default=medium |
| `score_per_question` | `number` | 否 |  | default=5; maximum=100.0; exclusiveMinimum=0.0 |
| `time_limit_minutes` | `anyOf(integer, null)` | 否 |  | default=30 |
| `passing_score` | `number` | 否 |  | default=60; minimum=0.0; maximum=100.0 |
| `max_attempts_per_user` | `anyOf(integer, null)` | 否 |  | default=1 |
| `knowledge` | ``KnowledgeSpec`` | 否 |  |  |
| `allowed_user_ids` | `anyOf(array<string (uuid)>, null)` | 否 |  |  |
| `sync_to_exam` | `boolean` | 否 |  | default=True |
| `prompt` | `anyOf(string, null)` | 否 |  |  |

### `QuestionGenerationJobDetail`

- Type：`object`
- Required：`id`, `user_id`, `status`, `title`, `question_count`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `user_id` | `string (uuid)` | 是 |  |  |
| `tenant_id` | `anyOf(string, null)` | 否 |  |  |
| `status` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `question_count` | `integer` | 是 |  |  |
| `ai_run_id` | `anyOf(string, null)` | 否 |  |  |
| `li_generation_task_id` | `anyOf(string, null)` | 否 |  |  |
| `exam_paper_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `source_dataset_ids` | `array<string>` | 否 |  |  |
| `error_code` | `anyOf(string, null)` | 否 |  |  |
| `error_message` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `request_payload` | `object` | 否 |  |  |
| `ai_raw_payload` | `anyOf(object, null)` | 否 |  |  |
| `exam_payload` | `anyOf(object, null)` | 否 |  |  |
| `exam_response` | `anyOf(object, null)` | 否 |  |  |

### `QuestionGenerationJobPublic`

- Type：`object`
- Required：`id`, `user_id`, `status`, `title`, `question_count`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `user_id` | `string (uuid)` | 是 |  |  |
| `tenant_id` | `anyOf(string, null)` | 否 |  |  |
| `status` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `question_count` | `integer` | 是 |  |  |
| `ai_run_id` | `anyOf(string, null)` | 否 |  |  |
| `li_generation_task_id` | `anyOf(string, null)` | 否 |  |  |
| `exam_paper_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `source_dataset_ids` | `array<string>` | 否 |  |  |
| `error_code` | `anyOf(string, null)` | 否 |  |  |
| `error_message` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `QuestionGenerationJobsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`QuestionGenerationJobPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `RedisKeyCreate`

- Type：`object`
- Required：`key`, `value`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  | minLength=1; maxLength=512 |
| `value` | `string` | 是 |  |  |
| `ttl_seconds` | `anyOf(integer, null)` | 否 |  |  |

### `RedisKeyPublic`

- Type：`object`
- Required：`key`, `value`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  |  |
| `value` | `string` | 是 |  |  |
| `ttl_seconds` | `anyOf(integer, null)` | 否 |  |  |

### `RedisKeysPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<string>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `RedisKeyUpdate`

- Type：`object`
- Required：`value`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `value` | `string` | 是 |  |  |
| `ttl_seconds` | `anyOf(integer, null)` | 否 |  |  |

### `ReleaseExecutionScope`

- Type：`object`
- Required：`schema_version`, `kind`, `workflow_release_ref`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 是 |  |  |
| `kind` | `string` | 是 |  |  |
| `workflow_release_ref` | `string` | 是 |  | minLength=1; maxLength=255 |

### `ResourceStatus`

- Type：`string (registered, creating, created, deploying, starting, running, stopped, unhealthy, deleting, deleted, failed)`

- Enum：`registered`, `creating`, `created`, `deploying`, `starting`, `running`, `stopped`, `unhealthy`, `deleting`, `deleted`, `failed`

### `RoleCreate`

- Type：`object`
- Required：`code`, `name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `scope_type` | `string` | 否 |  | default=system; maxLength=32 |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `is_system` | `boolean` | 否 |  | default=False |
| `is_active` | `boolean` | 否 |  | default=True |
| `permission_ids` | `array<string (uuid)>` | 否 |  |  |

### `RoleDetailPublic`

- Type：`object`
- Required：`code`, `name`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `scope_type` | `string` | 否 |  | default=system; maxLength=32 |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `is_system` | `boolean` | 否 |  | default=False |
| `is_active` | `boolean` | 否 |  | default=True |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `permission_count` | `integer` | 否 |  | default=0 |
| `user_count` | `integer` | 否 |  | default=0 |
| `permission_ids` | `array<string (uuid)>` | 否 |  |  |
| `permission_codes` | `array<string>` | 否 |  |  |

### `RolePermissionsUpdate`

- Type：`object`
- Required：`permission_ids`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `permission_ids` | `array<string (uuid)>` | 是 |  |  |

### `RolePublic`

- Type：`object`
- Required：`code`, `name`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `scope_type` | `string` | 否 |  | default=system; maxLength=32 |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `is_system` | `boolean` | 否 |  | default=False |
| `is_active` | `boolean` | 否 |  | default=True |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `permission_count` | `integer` | 否 |  | default=0 |
| `user_count` | `integer` | 否 |  | default=0 |

### `RolesPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`RolePublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `RoleUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `code` | `anyOf(string, null)` | 否 |  |  |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `scope_type` | `anyOf(string, null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `is_active` | `anyOf(boolean, null)` | 否 |  |  |

### `RouteStatus`

- Type：`string (pending, active, disabled, error, deleted)`

- Enum：`pending`, `active`, `disabled`, `error`, `deleted`

### `SecurityScanColumn`

- Type：`object`
- Required：`key`, `label`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `key` | `string` | 是 |  |  |
| `label` | `string` | 是 |  |  |

### `SecurityScanFinding`

- Type：`object`
- Required：`excel_row`, `issue_id`, `scan_tool`, `category`, `rule_id`, `module`, `file_path`, `line_number`, `scan_severity`, `manual_priority`, `finding_status`, `summary`, `review_conclusion`, `recommendation`, `credential_data_status`, `code_scope`, `remediation_status`, `owner`, `notes`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `excel_row` | `integer` | 是 | Original row number in the worksheet. |  |
| `issue_id` | `string` | 是 |  |  |
| `scan_tool` | `string` | 是 |  |  |
| `category` | `string` | 是 |  |  |
| `rule_id` | `string` | 是 |  |  |
| `module` | `string` | 是 |  |  |
| `file_path` | `string` | 是 |  |  |
| `line_number` | `integer` | 是 |  |  |
| `scan_severity` | `string` | 是 |  |  |
| `manual_priority` | `string` | 是 |  |  |
| `finding_status` | `string` | 是 |  |  |
| `summary` | `string` | 是 |  |  |
| `review_conclusion` | `string` | 是 |  |  |
| `recommendation` | `string` | 是 |  |  |
| `credential_data_status` | `string` | 是 |  |  |
| `code_scope` | `string` | 是 |  |  |
| `remediation_status` | `string` | 是 |  |  |
| `owner` | `string` | 是 |  |  |
| `notes` | `string` | 是 |  |  |

### `SecurityScanFindingsResponse`

- Type：`object`
- Required：`source_file`, `worksheet`, `title`, `description`, `columns`, `total`, `items`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `source_file` | `string` | 是 |  |  |
| `worksheet` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `description` | `string` | 是 |  |  |
| `columns` | `array<`SecurityScanColumn`>` | 是 |  |  |
| `total` | `integer` | 是 |  |  |
| `items` | `array<`SecurityScanFinding`>` | 是 |  |  |

### `ServiceAgentLinkCreate`

- Type：`object`
- Required：`agent_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `agent_id` | `string` | 是 |  | maxLength=128 |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `link_type` | `string` | 否 |  | default=supporting; maxLength=16 |
| `description` | `string` | 否 |  | default= |

### `ServiceAgentLinkPublic`

- Type：`object`
- Required：`agent_id`, `id`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `agent_id` | `string` | 是 |  | maxLength=128 |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `link_type` | `string` | 否 |  | default=supporting; maxLength=16 |
| `description` | `string` | 否 |  | default= |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `ServiceAgentLinkUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `link_type` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |

### `ServiceCategoryCreate`

- Type：`object`
- Required：`name`, `code`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `parent_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `sort_order` | `integer` | 否 |  | default=0 |
| `status` | `string` | 否 |  | default=active; maxLength=16 |

### `ServiceCategoryPublic`

- Type：`object`
- Required：`name`, `code`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `parent_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `sort_order` | `integer` | 否 |  | default=0 |
| `status` | `string` | 否 |  | default=active; maxLength=16 |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `children` | `array<`ServiceCategoryPublic`>` | 否 |  |  |

### `ServiceCategoryUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `code` | `anyOf(string, null)` | 否 |  |  |
| `parent_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `sort_order` | `anyOf(integer, null)` | 否 |  |  |
| `status` | `anyOf(string, null)` | 否 |  |  |

### `ServiceDefinitionCreate`

- Type：`object`
- Required：`name`, `code`, `category_id`, `owner_user_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `category_id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `owner_user_id` | `string (uuid)` | 是 |  |  |
| `description` | `string` | 否 |  | default= |
| `service_level` | `string` | 否 |  | default=P3; maxLength=8 |
| `status` | `string` | 否 |  | default=active; maxLength=16 |
| `sort_order` | `integer` | 否 |  | default=0 |

### `ServiceDefinitionPublic`

- Type：`object`
- Required：`name`, `code`, `category_id`, `owner_user_id`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `code` | `string` | 是 |  | minLength=1; maxLength=128 |
| `category_id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `owner_user_id` | `string (uuid)` | 是 |  |  |
| `description` | `string` | 否 |  | default= |
| `service_level` | `string` | 否 |  | default=P3; maxLength=8 |
| `status` | `string` | 否 |  | default=active; maxLength=16 |
| `sort_order` | `integer` | 否 |  | default=0 |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `ServiceDefinitionUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `code` | `anyOf(string, null)` | 否 |  |  |
| `category_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `owner_user_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `service_level` | `anyOf(string, null)` | 否 |  |  |
| `status` | `anyOf(string, null)` | 否 |  |  |
| `sort_order` | `anyOf(integer, null)` | 否 |  |  |

### `ServiceDetailPublic`

- Type：`object`
- Required：`service`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service` | ``ServiceDefinitionPublic`` | 是 |  |  |
| `nodes` | `array<`ServiceProcessNodePublic`>` | 否 |  |  |
| `systems` | `array<`ServiceRelatedSystemPublic`>` | 否 |  |  |
| `agent_links` | `array<`ServiceAgentLinkPublic`>` | 否 |  |  |

### `ServiceNodeMaterialCreate`

- Type：`object`
- Required：`material_type`, `name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `node_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `material_type` | `string` | 是 |  | maxLength=8 |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `string` | 否 |  | default= |
| `template_path` | `anyOf(string, null)` | 否 |  |  |

### `ServiceNodeMaterialPublic`

- Type：`object`
- Required：`material_type`, `name`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `node_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `material_type` | `string` | 是 |  | maxLength=8 |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `string` | 否 |  | default= |
| `template_path` | `anyOf(string, null)` | 否 |  |  |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `ServiceNodeMaterialUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `material_type` | `anyOf(string, null)` | 否 |  |  |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `template_path` | `anyOf(string, null)` | 否 |  |  |

### `ServiceProcessNodeCreate`

- Type：`object`
- Required：`name`, `sequence`, `node_type`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `sequence` | `integer` | 是 |  |  |
| `node_type` | `string` | 是 |  | maxLength=32 |
| `handler_role_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `estimated_duration_minutes` | `anyOf(integer, null)` | 否 |  |  |
| `description` | `string` | 否 |  | default= |

### `ServiceProcessNodePublic`

- Type：`object`
- Required：`name`, `sequence`, `node_type`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `sequence` | `integer` | 是 |  |  |
| `node_type` | `string` | 是 |  | maxLength=32 |
| `handler_role_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `estimated_duration_minutes` | `anyOf(integer, null)` | 否 |  |  |
| `description` | `string` | 否 |  | default= |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `ServiceProcessNodeUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `sequence` | `anyOf(integer, null)` | 否 |  |  |
| `node_type` | `anyOf(string, null)` | 否 |  |  |
| `handler_role_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `estimated_duration_minutes` | `anyOf(integer, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |

### `ServiceRelatedSystemCreate`

- Type：`object`
- Required：`name`, `system_type`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `system_type` | `string` | 是 |  | maxLength=32 |
| `interface_description` | `string` | 否 |  | default= |
| `url` | `anyOf(string, null)` | 否 |  |  |

### `ServiceRelatedSystemPublic`

- Type：`object`
- Required：`name`, `system_type`, `id`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `service_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `system_type` | `string` | 是 |  | maxLength=32 |
| `interface_description` | `string` | 否 |  | default= |
| `url` | `anyOf(string, null)` | 否 |  |  |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `ServiceRelatedSystemUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `system_type` | `anyOf(string, null)` | 否 |  |  |
| `interface_description` | `anyOf(string, null)` | 否 |  |  |
| `url` | `anyOf(string, null)` | 否 |  |  |

### `ServiceStatus`

- Type：`string (starting, healthy, unhealthy, disabled, deleted)`

- Enum：`starting`, `healthy`, `unhealthy`, `disabled`, `deleted`

### `SkillCodeSnippetPublic`

- Type：`object`
- Required：`language`, `filename`, `content`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `language` | `string` | 是 |  |  |
| `filename` | `string` | 是 |  |  |
| `content` | `string` | 是 |  |  |

### `SkillCreate`

- Type：`object`
- Required：`name`, `category`, `prompt`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `category` | `string` | 是 |  | minLength=1; maxLength=64 |
| `description` | `string` | 否 |  | default= |
| `prompt` | `string` | 是 |  | minLength=1 |
| `code_snippets` | `array<`SkillCodeSnippetPublic`>` | 否 |  |  |
| `environment` | `string (UAT, PROD)` | 否 |  | default=PROD |
| `status` | `string (hot, cold)` | 否 |  | default=hot |
| `visibility` | `string (public, private)` | 否 |  | default=public |
| `owner_tenant_id` | `anyOf(string, null)` | 否 |  |  |
| `source_task_id` | `anyOf(string, null)` | 否 |  |  |
| `embedding_tags` | `array<string>` | 否 |  |  |
| `event_metadata` | `object` | 否 |  |  |

### `SkillDeletePublic`

- Type：`object`
- Required：`message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `message` | `string` | 是 |  |  |

### `SkillDetailPublic`

- Type：`object`
- Required：`skill_id`, `name`, `category`, `description`, `prompt`, `code_snippets`, `environment`, `status`, `call_count`, `version`, `embedding_tags`, `event_metadata`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `skill_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `category` | `string` | 是 |  |  |
| `description` | `string` | 是 |  |  |
| `prompt` | `string` | 是 |  |  |
| `code_snippets` | `array<`SkillCodeSnippetPublic`>` | 是 |  |  |
| `environment` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `success_rate` | `anyOf(number, null)` | 否 |  |  |
| `call_count` | `integer` | 是 |  |  |
| `version` | `string` | 是 |  |  |
| `visibility` | `string` | 否 |  | default=public |
| `owner_tenant_id` | `anyOf(string, null)` | 否 |  |  |
| `source_task_id` | `anyOf(string, null)` | 否 |  |  |
| `embedding_tags` | `array<string>` | 是 |  |  |
| `event_metadata` | `object` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `SkillListItemPublic`

- Type：`object`
- Required：`skill_id`, `name`, `category`, `description`, `environment`, `status`, `call_count`, `version`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `skill_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `category` | `string` | 是 |  |  |
| `description` | `string` | 是 |  |  |
| `environment` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `success_rate` | `anyOf(number, null)` | 否 |  |  |
| `call_count` | `integer` | 是 |  |  |
| `version` | `string` | 是 |  |  |
| `visibility` | `string` | 否 |  | default=public |
| `owner_tenant_id` | `anyOf(string, null)` | 否 |  |  |
| `organization_id` | `anyOf(string, null)` | 否 |  |  |
| `source_task_id` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `SkillListPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`SkillListItemPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `SkillMutationPublic`

- Type：`object`
- Required：`skill_id`, `name`, `message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `skill_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `message` | `string` | 是 |  |  |

### `SkillUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `category` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `prompt` | `anyOf(string, null)` | 否 |  |  |
| `code_snippets` | `anyOf(array<`SkillCodeSnippetPublic`>, null)` | 否 |  |  |
| `environment` | `anyOf(string (UAT, PROD), null)` | 否 |  |  |
| `status` | `anyOf(string (hot, cold, deprecated), null)` | 否 |  |  |
| `visibility` | `anyOf(string (public, private), null)` | 否 |  |  |
| `owner_tenant_id` | `anyOf(string, null)` | 否 |  |  |
| `source_task_id` | `anyOf(string, null)` | 否 |  |  |
| `embedding_tags` | `anyOf(array<string>, null)` | 否 |  |  |
| `event_metadata` | `anyOf(object, null)` | 否 |  |  |

### `StageSwitchAssigneePublic`

- Type：`object`
- Required：`id`, `node_id`, `user_id`, `source_type`, `assignee_status`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `node_id` | `string (uuid)` | 是 |  |  |
| `user_id` | `string (uuid)` | 是 |  |  |
| `source_type` | `string` | 是 |  |  |
| `assignee_status` | `string` | 是 |  |  |
| `acted_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `StageSwitchAuditEventListPublic`

- Type：`object`
- Required：`data`, `total`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`StageSwitchAuditEventPublic`>` | 是 |  |  |
| `total` | `integer` | 是 |  |  |

### `StageSwitchAuditEventPublic`

- Type：`object`
- Required：`id`, `event_type`, `actor_id`, `action`, `outcome`, `event_metadata`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `integer` | 是 |  |  |
| `event_type` | `string` | 是 |  |  |
| `actor_id` | `string` | 是 |  |  |
| `action` | `string` | 是 |  |  |
| `outcome` | `string` | 是 |  |  |
| `event_metadata` | `object` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `StageSwitchDecisionCreate`

- Type：`object`
- Required：`decision`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `decision` | `string` | 是 |  | maxLength=16 |
| `rationale` | `string` | 否 |  | default= |
| `expected_request_version` | `integer` | 否 |  | default=1 |
| `expected_node_version` | `integer` | 否 |  | default=1 |

### `StageSwitchDecisionPublic`

- Type：`object`
- Required：`id`, `request_id`, `node_id`, `decision`, `rationale`, `decided_by`, `decided_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `request_id` | `string (uuid)` | 是 |  |  |
| `node_id` | `string (uuid)` | 是 |  |  |
| `decision` | `string` | 是 |  |  |
| `rationale` | `string` | 是 |  |  |
| `decided_by` | `string (uuid)` | 是 |  |  |
| `decided_at` | `string (date-time)` | 是 |  |  |

### `StageSwitchDetailPublic`

- Type：`object`
- Required：`request`, `nodes`, `assignees`, `decisions`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `request` | ``StageSwitchRequestPublic`` | 是 |  |  |
| `nodes` | `array<`StageSwitchNodePublic`>` | 是 |  |  |
| `assignees` | `array<`StageSwitchAssigneePublic`>` | 是 |  |  |
| `decisions` | `array<`StageSwitchDecisionPublic`>` | 是 |  |  |

### `StageSwitchMarkAllReadPublic`

- Type：`object`
- Required：`success`, `updated_count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `success` | `boolean` | 是 |  |  |
| `updated_count` | `integer` | 是 |  |  |

### `StageSwitchNodePublic`

- Type：`object`
- Required：`id`, `request_id`, `node_key`, `name`, `sequence`, `approval_mode`, `status`, `required_count`, `approved_count`, `rejected_count`, `version`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `request_id` | `string (uuid)` | 是 |  |  |
| `node_key` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `sequence` | `integer` | 是 |  |  |
| `approval_mode` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `required_count` | `integer` | 是 |  |  |
| `approved_count` | `integer` | 是 |  |  |
| `rejected_count` | `integer` | 是 |  |  |
| `activated_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `due_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `completed_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `version` | `integer` | 是 |  |  |

### `StageSwitchNotificationListPublic`

- Type：`object`
- Required：`data`, `total`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`StageSwitchNotificationPublic`>` | 是 |  |  |
| `total` | `integer` | 是 |  |  |

### `StageSwitchNotificationPublic`

- Type：`object`
- Required：`id`, `recipient_id`, `notification_type`, `title_key`, `body_key`, `payload`, `status`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `recipient_id` | `string (uuid)` | 是 |  |  |
| `request_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `notification_type` | `string` | 是 |  |  |
| `title_key` | `string` | 是 |  |  |
| `body_key` | `string` | 是 |  |  |
| `payload` | `object` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `read_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `StageSwitchRequestCancel`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `rationale` | `string` | 否 |  | default= |

### `StageSwitchRequestCreate`

- Type：`object`
- Required：`agent_id`, `source_stage`, `target_stage`, `direction`, `idempotency_key`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  | maxLength=128 |
| `source_stage` | `string` | 是 |  | maxLength=32 |
| `target_stage` | `string` | 是 |  | maxLength=32 |
| `direction` | `string` | 是 |  | maxLength=16 |
| `reason` | `string` | 否 |  | default= |
| `transition_params` | `object` | 否 |  |  |
| `idempotency_key` | `string` | 是 |  | maxLength=160 |

### `StageSwitchRequestListPublic`

- Type：`object`
- Required：`data`, `total`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`StageSwitchRequestPublic`>` | 是 |  |  |
| `total` | `integer` | 是 |  |  |

### `StageSwitchRequestPublic`

- Type：`object`
- Required：`id`, `request_no`, `agent_id`, `source_stage`, `target_stage`, `direction`, `reason`, `transition_params`, `requester_id`, `template_id`, `approval_status`, `execution_status`, `version`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `request_no` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string, null)` | 否 |  |  |
| `agent_id` | `string` | 是 |  |  |
| `source_stage` | `string` | 是 |  |  |
| `target_stage` | `string` | 是 |  |  |
| `direction` | `string` | 是 |  |  |
| `reason` | `string` | 是 |  |  |
| `transition_params` | `object` | 是 |  |  |
| `requester_id` | `string (uuid)` | 是 |  |  |
| `template_id` | `string (uuid)` | 是 |  |  |
| `evaluation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `review_case_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `approval_status` | `string` | 是 |  |  |
| `execution_status` | `string` | 是 |  |  |
| `current_node_sequence` | `anyOf(integer, null)` | 否 |  |  |
| `version` | `integer` | 是 |  |  |
| `submitted_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `approved_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `rejected_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `can_current_user_decide` | `boolean` | 否 |  | default=False |

### `StageSwitchRetryExecution`

- Type：`object`

### `StageSwitchTemplateCreate`

- Type：`object`
- Required：`template_key`, `name`, `direction`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `template_key` | `string` | 是 |  | maxLength=128 |
| `name` | `string` | 是 |  | maxLength=255 |
| `direction` | `string` | 是 |  | maxLength=16 |
| `description` | `string` | 否 |  | default= |
| `nodes` | `array<object>` | 否 |  |  |

### `StageSwitchTemplateDetailPublic`

- Type：`object`
- Required：`template`, `nodes`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `template` | ``StageSwitchTemplatePublic`` | 是 |  |  |
| `nodes` | `array<`StageSwitchTemplateNodePublic`>` | 是 |  |  |

### `StageSwitchTemplateListPublic`

- Type：`object`
- Required：`data`, `total`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`StageSwitchTemplatePublic`>` | 是 |  |  |
| `total` | `integer` | 是 |  |  |

### `StageSwitchTemplateNodePublic`

- Type：`object`
- Required：`id`, `template_id`, `node_key`, `name`, `sequence`, `approval_mode`, `approver_source_type`, `approver_source_config`, `sla_minutes`, `reminder_policy`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `template_id` | `string (uuid)` | 是 |  |  |
| `node_key` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `sequence` | `integer` | 是 |  |  |
| `approval_mode` | `string` | 是 |  |  |
| `approver_source_type` | `string` | 是 |  |  |
| `approver_source_config` | `object` | 是 |  |  |
| `sla_minutes` | `integer` | 是 |  |  |
| `reminder_policy` | `object` | 是 |  |  |

### `StageSwitchTemplatePublic`

- Type：`object`
- Required：`id`, `template_key`, `name`, `direction`, `version`, `status`, `is_default`, `description`, `created_by`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `template_key` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `name` | `string` | 是 |  |  |
| `direction` | `string` | 是 |  |  |
| `version` | `integer` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `is_default` | `boolean` | 是 |  |  |
| `description` | `string` | 是 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `published_by` | `anyOf(string (uuid), null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `published_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `StageSwitchTemplateUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `node_updates` | `array<object>` | 否 |  |  |

### `StageSwitchUnreadCountPublic`

- Type：`object`
- Required：`count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `count` | `integer` | 是 |  |  |

### `TaskActionPublic`

- Type：`object`
- Required：`task_id`, `status`, `message`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `message` | `string` | 是 |  |  |

### `TaskLayoutPublic`

- Type：`object`
- Required：`schemaVersion`, `page`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schemaVersion` | `string` | 是 |  |  |
| `page` | `object` | 是 |  |  |

### `TaskSnapshotErrorContextLinePublic`

- Type：`object`
- Required：`line_no`, `content`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `line_no` | `integer` | 是 |  |  |
| `content` | `string` | 是 |  |  |

### `TaskSnapshotErrorPublic`

- Type：`object`
- Required：`stage`, `error_type`, `message`, `failed_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `stage` | `string` | 是 |  |  |
| `error_type` | `string` | 是 |  |  |
| `message` | `string` | 是 |  |  |
| `detail` | `anyOf(string, null)` | 否 |  |  |
| `solution` | `anyOf(string, null)` | 否 |  |  |
| `failed_file` | `anyOf(string, null)` | 否 |  |  |
| `failed_line` | `anyOf(integer, null)` | 否 |  |  |
| `traceback` | `anyOf(string, null)` | 否 |  |  |
| `context` | `anyOf(array<`TaskSnapshotErrorContextLinePublic`>, null)` | 否 |  |  |
| `failed_at` | `string (date-time)` | 是 |  |  |

### `TaskSnapshotPublic`

- Type：`object`
- Required：`task_id`, `tenant_id`, `title`, `status`, `retry_count`, `snapshot_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 |  |  |
| `tenant_id` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string, null)` | 否 |  |  |
| `title` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `current_node` | `anyOf(string, null)` | 否 |  |  |
| `retry_count` | `integer` | 是 |  |  |
| `snapshot_at` | `string (date-time)` | 是 |  |  |
| `error` | `anyOf(`TaskSnapshotErrorPublic`, null)` | 否 |  |  |
| `source_code` | `anyOf(`TaskSnapshotSourceCodePublic`, null)` | 否 |  |  |
| `payload_summary` | `object` | 否 |  |  |

### `TaskSnapshotSourceCodePublic`

- Type：`object`
- Required：`repo_url`, `commit_sha`, `branch`, `clone_url`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `repo_url` | `string` | 是 |  |  |
| `commit_sha` | `string` | 是 |  |  |
| `branch` | `string` | 是 |  |  |
| `clone_url` | `string` | 是 |  |  |

### `TaskStatus`

- Type：`string (CREATED, ANALYZING, ROUTING, CODING, TESTING, DEPLOYING, COMPLETED, PENDING_APPROVAL, FAILED)`

- Enum：`CREATED`, `ANALYZING`, `ROUTING`, `CODING`, `TESTING`, `DEPLOYING`, `COMPLETED`, `PENDING_APPROVAL`, `FAILED`

### `TaskWidgetDataPublic`

- Type：`object`
- Required：`widget_id`, `data`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `widget_id` | `string` | 是 |  |  |
| `data` | `object` | 是 |  |  |
| `total` | `anyOf(integer, null)` | 否 |  |  |

### `TenantAgentBudgetPublic`

- Type：`object`
- Required：`agent_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  |  |
| `runtime_token_budget` | `anyOf(number, null)` | 否 |  |  |

### `TenantAgentBudgetUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `runtime_token_budget` | `anyOf(number, null)` | 否 |  |  |

### `TenantAgentDetailPublic`

- Type：`object`
- Required：`agent_id`, `name`, `description`, `status`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `is_favorited` | `boolean` | 否 |  | default=False |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `endpoint_url` | `anyOf(string, null)` | 否 |  |  |
| `runtime_token_budget` | `anyOf(number, null)` | 否 |  |  |
| `current_usage` | `number` | 否 |  | default=0 |
| `created_at` | `string (date-time)` | 是 |  |  |
| `last_invoked_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `production_status` | `string` | 否 |  | default=none |
| `qa_passed` | `anyOf(boolean, null)` | 否 |  |  |
| `deployment_version` | `anyOf(integer, null)` | 否 |  |  |
| `approved_by` | `anyOf(string, null)` | 否 |  |  |
| `approved_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `TenantAgentListPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`TenantAgentSummaryPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `TenantAgentSummaryPublic`

- Type：`object`
- Required：`agent_id`, `name`, `description`, `status`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `agent_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `is_favorited` | `boolean` | 否 |  | default=False |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `endpoint_url` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `last_invoked_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `production_status` | `string` | 否 |  | default=none |
| `qa_passed` | `anyOf(boolean, null)` | 否 |  |  |
| `deployment_version` | `anyOf(integer, null)` | 否 |  |  |
| `approved_by` | `anyOf(string, null)` | 否 |  |  |
| `approved_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `TenantAppMenuNode`

- Type：`object`
- Required：`id`, `title`, `type`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `type` | `string (group, folder, app)` | 是 |  |  |
| `created_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `order` | `anyOf(integer, null)` | 否 |  |  |
| `agent_id` | `anyOf(string, null)` | 否 |  |  |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `preview_url` | `anyOf(string, null)` | 否 |  |  |
| `icon_url` | `anyOf(string, null)` | 否 |  |  |
| `children` | `array<`TenantAppMenuNode`>` | 否 |  |  |

### `TenantAppMenuNodeCreate`

- Type：`object`
- Required：`title`, `type`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `anyOf(string, null)` | 否 |  |  |
| `parent_id` | `anyOf(string, null)` | 否 |  |  |
| `title` | `string` | 是 |  | minLength=1; maxLength=255 |
| `type` | `string (group, folder, app)` | 是 |  |  |
| `order` | `integer` | 否 |  | default=0 |
| `agent_id` | `anyOf(string, null)` | 否 |  |  |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `preview_url` | `anyOf(string, null)` | 否 |  |  |
| `icon_url` | `anyOf(string, null)` | 否 |  |  |

### `TenantAppMenuPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`TenantAppMenuNode`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `TenantBillingBalancePublic`

- Type：`object`
- Required：`tenant_id`, `balance`, `balance_by_type`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `tenant_id` | `string` | 是 |  |  |
| `balance` | `number` | 是 |  |  |
| `balance_by_type` | `object` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `TenantBillingRecordPublic`

- Type：`object`
- Required：`record_id`, `resource_type`, `amount`, `unit`, `cost`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `record_id` | `string` | 是 |  |  |
| `agent_id` | `anyOf(string, null)` | 否 |  |  |
| `agent_name` | `anyOf(string, null)` | 否 |  |  |
| `resource_type` | `string` | 是 |  |  |
| `amount` | `number` | 是 |  |  |
| `unit` | `string` | 是 |  |  |
| `cost` | `number` | 是 |  |  |
| `task_id` | `anyOf(string, null)` | 否 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `TenantBillingRecordsPublic`

- Type：`object`
- Required：`data`, `count`, `total_cost`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`TenantBillingRecordPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |
| `total_cost` | `number` | 是 |  |  |

### `TenantTaskListPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`TenantTaskSummaryPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `TenantTaskSummaryPublic`

- Type：`object`
- Required：`task_id`, `tenant_id`, `title`, `status`, `retry_count`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 |  |  |
| `tenant_id` | `string` | 是 |  |  |
| `organization_id` | `anyOf(string, null)` | 否 |  |  |
| `title` | `string` | 是 |  |  |
| `web_url` | `anyOf(string, null)` | 否 |  |  |
| `web_url_headers` | `anyOf(object, null)` | 否 |  |  |
| `web_url_request` | `anyOf(object, null)` | 否 |  |  |
| `task_type` | `anyOf(string, null)` | 否 |  |  |
| `status` | `string` | 是 |  |  |
| `current_node` | `anyOf(string, null)` | 否 |  |  |
| `retry_count` | `integer` | 是 |  |  |
| `last_error` | `anyOf(object, null)` | 否 |  |  |
| `quality_failure` | `anyOf(object, null)` | 否 |  |  |
| `manual_fix_required` | `anyOf(boolean, null)` | 否 |  |  |
| `pending_approval_reason` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `TestExecutionScope`

- Type：`object`
- Required：`schema_version`, `kind`, `workflow_draft_ref`, `workflow_test_run_ref`, `binding_set_hash`, `expires_at`, `test_execution_grant_ref`, `grant_hash`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 是 |  |  |
| `kind` | `string` | 是 |  |  |
| `workflow_draft_ref` | `string` | 是 |  | minLength=1; maxLength=255 |
| `workflow_test_run_ref` | `string` | 是 |  | minLength=1; maxLength=255 |
| `binding_set_hash` | `string` | 是 |  | pattern=^sha256:[0-9a-f]{64}$ |
| `expires_at` | `string (date-time)` | 是 |  |  |
| `test_execution_grant_ref` | `string` | 是 |  | minLength=1; maxLength=255 |
| `grant_hash` | `string` | 是 |  | pattern=^sha256:[0-9a-f]{64}$ |

### `Token`

- Type：`object`
- Required：`access_token`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `access_token` | `string` | 是 |  |  |
| `token_type` | `string` | 否 |  | default=bearer |

### `ToolInternalInvocationRequest`

- Type：`object`
- Required：`organization_id`, `user_id`, `app_id`, `run_id`, `trace_id`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `user_id` | `string (uuid)` | 是 |  |  |
| `app_id` | `string` | 是 |  | minLength=1; maxLength=128 |
| `version_id` | `anyOf(string, null)` | 否 |  |  |
| `test_run_id` | `anyOf(string, null)` | 否 |  |  |
| `run_id` | `string` | 是 |  | minLength=1; maxLength=128 |
| `trace_id` | `string` | 是 |  | minLength=1; maxLength=128 |
| `input` | `object` | 否 |  |  |

### `ToolInvocationPublic`

- Type：`object`
- Required：`tool_ref`, `trace_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `tool_ref` | `string` | 是 |  |  |
| `result` | `object` | 否 |  |  |
| `trace_id` | `string` | 是 |  |  |

### `ToolInvocationRequest`

- Type：`object`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `input` | `object` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `trace_id` | `anyOf(string, null)` | 否 |  |  |

### `ToolLifecycleRequest`

- Type：`object`
- Required：`organization_id`, `reason`, `actor_id`, `occurred_at`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `reason` | `string` | 是 |  | minLength=10; maxLength=1000 |
| `actor_id` | `string (uuid)` | 是 |  |  |
| `occurred_at` | `string (date-time)` | 是 |  |  |

### `ToolRegistrationEvent`

- Type：`object`
- Required：`schema_version`, `event_id`, `event_type`, `occurred_at`, `producer`, `idempotency_key`, `organization_id`, `source_type`, `source_id`, `source_version`, `schema_hash`, `projection`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 是 |  |  |
| `event_id` | `string (uuid)` | 是 |  |  |
| `event_type` | `string` | 是 |  |  |
| `occurred_at` | `string (date-time)` | 是 |  |  |
| `producer` | `string` | 是 |  |  |
| `idempotency_key` | `string` | 是 |  | minLength=1; maxLength=255 |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `source_type` | `string` | 是 |  |  |
| `source_id` | `string (uuid)` | 是 |  |  |
| `source_version` | `integer` | 是 |  | minimum=1.0 |
| `schema_hash` | `string` | 是 |  | pattern=^[0-9a-f]{64}$ |
| `projection` | ``ToolRegistrationProjectionInput`` | 是 |  |  |

### `ToolRegistrationProjectionInput`

- Type：`object`
- Required：`name`, `description`, `operation_type`, `risk_level`, `business_input_schema`, `business_output_schema`, `required_scopes`, `executor_type`, `executor_binding_ref`, `completion_mode`, `idempotency_mode`, `business_key_policy_ref`, `business_key_policy_hash`, `reconciliation_contract_ref`, `reconciliation_contract_hash`, `callback_adapter_contract_ref`, `callback_adapter_contract_hash`, `revocation_policy_version`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `name` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `string` | 是 |  | minLength=30; maxLength=2000 |
| `operation_type` | `string (read, write)` | 是 |  |  |
| `risk_level` | `string (low, medium, high)` | 是 |  |  |
| `business_input_schema` | `object` | 是 |  |  |
| `business_output_schema` | `object` | 是 |  |  |
| `required_scopes` | `array<string>` | 是 |  | maxItems=32 |
| `executor_type` | `string` | 是 |  |  |
| `executor_binding_ref` | `string` | 是 |  | minLength=1; maxLength=255 |
| `completion_mode` | `string (sync, async)` | 是 |  |  |
| `idempotency_mode` | `anyOf(string (native_idempotent, reconcilable, non_idempotent), null)` | 是 |  |  |
| `business_key_policy_ref` | `anyOf(string, null)` | 是 |  |  |
| `business_key_policy_hash` | `anyOf(string, null)` | 是 |  |  |
| `reconciliation_contract_ref` | `anyOf(string, null)` | 是 |  |  |
| `reconciliation_contract_hash` | `anyOf(string, null)` | 是 |  |  |
| `callback_adapter_contract_ref` | `anyOf(string, null)` | 是 |  |  |
| `callback_adapter_contract_hash` | `anyOf(string, null)` | 是 |  |  |
| `revocation_policy_version` | `string` | 是 |  |  |

### `ToolRegistrationPublic`

- Type：`object`
- Required：`tool_ref`, `plugin_id`, `version`, `tool_key`, `name`, `method`, `schema_hash`, `timeout_ms`, `health_status`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `tool_ref` | `string` | 是 |  |  |
| `plugin_id` | `string` | 是 |  |  |
| `version` | `string` | 是 |  |  |
| `tool_key` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `method` | `string` | 是 |  |  |
| `input_schema` | `object` | 否 |  |  |
| `output_schema` | `object` | 否 |  |  |
| `schema_hash` | `string` | 是 |  |  |
| `required_scope` | `anyOf(string, null)` | 否 |  |  |
| `timeout_ms` | `integer` | 是 |  |  |
| `read_only` | `boolean` | 否 |  | default=True |
| `health_status` | `string` | 是 |  |  |

### `ToolRegistrationsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`ToolRegistrationPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `ToolRegistryProjectionInternal`

- Type：`object`
- Required：`schema_version`, `organization_id`, `tool_id`, `tool_key`, `tool_ref`, `source_type`, `source_id`, `source_version`, `name`, `description`, `operation_type`, `risk_level`, `business_input_schema`, `business_output_schema`, `schema_hash`, `required_scopes`, `completion_mode`, `idempotency_mode`, `revocation_policy_version`, `lifecycle_status`, `registered_at`, `deprecated_at`, `revoked_at`, `executor_type`, `executor_binding_ref`, `business_key_policy_ref`, `business_key_policy_hash`, `reconciliation_contract_ref`, `reconciliation_contract_hash`, `callback_adapter_contract_ref`, `callback_adapter_contract_hash`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 是 |  |  |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `tool_id` | `string (uuid)` | 是 |  |  |
| `tool_key` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9_]{2,63}$ |
| `tool_ref` | `string` | 是 |  | maxLength=255; pattern=^urn:ffai:tool:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[^:]{1,128}$ |
| `source_type` | `string (api_tool, plugin_tool)` | 是 |  |  |
| `source_id` | `string` | 是 |  | minLength=1; maxLength=255 |
| `source_version` | `anyOf(integer, string)` | 是 |  |  |
| `name` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `string` | 是 |  | minLength=30; maxLength=2000 |
| `operation_type` | `string (read, write)` | 是 |  |  |
| `risk_level` | `string (low, medium, high)` | 是 |  |  |
| `business_input_schema` | `object` | 是 |  |  |
| `business_output_schema` | `object` | 是 |  |  |
| `schema_hash` | `string` | 是 |  | pattern=^[0-9a-f]{64}$ |
| `required_scopes` | `array<string>` | 是 |  |  |
| `completion_mode` | `string (sync, async)` | 是 |  |  |
| `idempotency_mode` | `anyOf(string (native_idempotent, reconcilable, non_idempotent), null)` | 是 |  |  |
| `revocation_policy_version` | `string` | 是 |  |  |
| `lifecycle_status` | `string (active, deprecated, revoked)` | 是 |  |  |
| `registered_at` | `string (date-time)` | 是 |  |  |
| `deprecated_at` | `anyOf(string (date-time), null)` | 是 |  |  |
| `revoked_at` | `anyOf(string (date-time), null)` | 是 |  |  |
| `executor_type` | `string (data_gateway, plugin)` | 是 |  |  |
| `executor_binding_ref` | `string` | 是 |  | minLength=1; maxLength=255 |
| `business_key_policy_ref` | `anyOf(string, null)` | 是 |  |  |
| `business_key_policy_hash` | `anyOf(string, null)` | 是 |  |  |
| `reconciliation_contract_ref` | `anyOf(string, null)` | 是 |  |  |
| `reconciliation_contract_hash` | `anyOf(string, null)` | 是 |  |  |
| `callback_adapter_contract_ref` | `anyOf(string, null)` | 是 |  |  |
| `callback_adapter_contract_hash` | `anyOf(string, null)` | 是 |  |  |

### `ToolRegistryProjectionPage`

- Type：`object`
- Required：`data`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`ToolRegistryProjectionPublic`>` | 是 |  |  |
| `next_cursor` | `anyOf(string, null)` | 否 |  |  |

### `ToolRegistryProjectionPublic`

- Type：`object`
- Required：`schema_version`, `organization_id`, `tool_id`, `tool_key`, `tool_ref`, `source_type`, `source_id`, `source_version`, `name`, `description`, `operation_type`, `risk_level`, `business_input_schema`, `business_output_schema`, `schema_hash`, `required_scopes`, `completion_mode`, `idempotency_mode`, `revocation_policy_version`, `lifecycle_status`, `registered_at`, `deprecated_at`, `revoked_at`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 是 |  |  |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `tool_id` | `string (uuid)` | 是 |  |  |
| `tool_key` | `string` | 是 |  | maxLength=64; pattern=^[a-z][a-z0-9_]{2,63}$ |
| `tool_ref` | `string` | 是 |  | maxLength=255; pattern=^urn:ffai:tool:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[^:]{1,128}$ |
| `source_type` | `string (api_tool, plugin_tool)` | 是 |  |  |
| `source_id` | `string` | 是 |  | minLength=1; maxLength=255 |
| `source_version` | `anyOf(integer, string)` | 是 |  |  |
| `name` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `string` | 是 |  | minLength=30; maxLength=2000 |
| `operation_type` | `string (read, write)` | 是 |  |  |
| `risk_level` | `string (low, medium, high)` | 是 |  |  |
| `business_input_schema` | `object` | 是 |  |  |
| `business_output_schema` | `object` | 是 |  |  |
| `schema_hash` | `string` | 是 |  | pattern=^[0-9a-f]{64}$ |
| `required_scopes` | `array<string>` | 是 |  |  |
| `completion_mode` | `string (sync, async)` | 是 |  |  |
| `idempotency_mode` | `anyOf(string (native_idempotent, reconcilable, non_idempotent), null)` | 是 |  |  |
| `revocation_policy_version` | `string` | 是 |  |  |
| `lifecycle_status` | `string (active, deprecated, revoked)` | 是 |  |  |
| `registered_at` | `string (date-time)` | 是 |  |  |
| `deprecated_at` | `anyOf(string (date-time), null)` | 是 |  |  |
| `revoked_at` | `anyOf(string (date-time), null)` | 是 |  |  |

### `ToolRegistryResolveRequest`

- Type：`object`
- Required：`organization_id`, `tool_ref`, `purpose`, `expected_schema_hash`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `tool_ref` | `string` | 是 |  | maxLength=255; pattern=^urn:ffai:tool:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[^:]{1,128}$ |
| `purpose` | `string (authoring, publication, execution)` | 是 |  |  |
| `expected_schema_hash` | `string` | 是 |  | pattern=^[0-9a-f]{64}$ |
| `authorization_context_ref` | `anyOf(string, null)` | 否 |  |  |
| `execution_scope` | `anyOf(oneOf(`ReleaseExecutionScope`, `TestExecutionScope`), null)` | 否 |  |  |

### `UmcUserMappingCreate`

- Type：`object`
- Required：`umc_user_id`, `platform_role`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `umc_user_id` | `string` | 是 |  | minLength=1; maxLength=255 |
| `platform_role` | `string (customer, admin)` | 是 |  |  |
| `enabled` | `boolean` | 否 |  | default=True |
| `remark` | `anyOf(string, null)` | 否 |  |  |

### `UmcUserMappingPublic`

- Type：`object`
- Required：`id`, `umc_user_id`, `platform_role`, `platform_user_id`, `platform_user_email`, `enabled`, `remark`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `umc_user_id` | `string` | 是 |  |  |
| `platform_role` | `string (customer, admin)` | 是 |  |  |
| `platform_user_id` | `string (uuid)` | 是 |  |  |
| `platform_user_email` | `string (email)` | 是 |  |  |
| `enabled` | `boolean` | 是 |  |  |
| `remark` | `anyOf(string, null)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `UmcUserMappingsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`UmcUserMappingPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `UmcUserMappingUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `platform_role` | `anyOf(string (customer, admin), null)` | 否 |  |  |
| `enabled` | `anyOf(boolean, null)` | 否 |  |  |
| `remark` | `anyOf(string, null)` | 否 |  |  |

### `UpdatePassword`

- Type：`object`
- Required：`current_password`, `new_password`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `current_password` | `string` | 是 |  | minLength=8; maxLength=128 |
| `new_password` | `string` | 是 |  | minLength=8; maxLength=128 |

### `UserCreate`

- Type：`object`
- Required：`email`, `password`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `email` | `string (email)` | 是 |  | maxLength=255 |
| `is_active` | `boolean` | 否 |  | default=True |
| `is_superuser` | `boolean` | 否 |  | default=False |
| `full_name` | `anyOf(string, null)` | 否 |  |  |
| `password` | `string` | 是 |  | minLength=8; maxLength=128 |
| `role_ids` | `array<string>` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |

### `UserOrganizationInput`

- Type：`object`
- Required：`organization_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `is_primary` | `boolean` | 否 |  | default=False |
| `position` | `anyOf(string, null)` | 否 |  |  |

### `UserOrganizationsUpdate`

- Type：`object`
- Required：`organizations`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organizations` | `array<`UserOrganizationInput`>` | 是 |  |  |

### `UserPublic`

- Type：`object`
- Required：`email`, `id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `email` | `string (email)` | 是 |  | maxLength=255 |
| `is_active` | `boolean` | 否 |  | default=True |
| `is_superuser` | `boolean` | 否 |  | default=False |
| `full_name` | `anyOf(string, null)` | 否 |  |  |
| `id` | `string (uuid)` | 是 |  |  |
| `created_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `primary_organization` | `anyOf(`PrimaryOrganizationPublic`, null)` | 否 |  |  |

### `UserRoleAssignment`

- Type：`object`
- Required：`role_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `role_id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `expires_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `UserRolesUpdate`

- Type：`object`
- Required：`assignments`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `assignments` | `array<`UserRoleAssignment`>` | 是 |  |  |

### `UsersPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`UserPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `UserUpdate`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `email` | `anyOf(string (email), null)` | 否 |  |  |
| `is_active` | `boolean` | 否 |  | default=True |
| `is_superuser` | `boolean` | 否 |  | default=False |
| `full_name` | `anyOf(string, null)` | 否 |  |  |
| `password` | `anyOf(string, null)` | 否 |  |  |
| `organization_id` | `anyOf(string (uuid), null)` | 否 |  |  |

### `UserUpdateMe`

- Type：`object`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `full_name` | `anyOf(string, null)` | 否 |  |  |
| `email` | `anyOf(string (email), null)` | 否 |  |  |

### `ValidationError`

- Type：`object`
- Required：`loc`, `msg`, `type`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `loc` | `array<anyOf(string, integer)>` | 是 |  |  |
| `msg` | `string` | 是 |  |  |
| `type` | `string` | 是 |  |  |
| `input` | `object` | 否 |  |  |
| `ctx` | `object` | 否 |  |  |

### `WebResearchExtractedPage`

- Type：`object`
- Required：`url`, `markdown`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `url` | `string` | 是 | Extracted page URL. |  |
| `title` | `anyOf(string, null)` | 否 | Extracted page title. |  |
| `markdown` | `string` | 是 | Extracted page content in Markdown or Markdown-compatible text. |  |
| `source` | `anyOf(string, null)` | 否 | Source site or domain when provided by Hermes. |  |

### `WebResearchPublic`

- Type：`object`
- Required：`query`, `results`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `provider` | `string` | 否 | Research provider identifier. | default=hermes |
| `query` | `string` | 是 | Normalized query executed by Hermes. |  |
| `results` | `array<`WebResearchSearchResult`>` | 是 | Normalized search results. |  |
| `extracted_pages` | `array<`WebResearchExtractedPage`>` | 否 | Markdown extraction results for the first N search results. |  |
| `facts` | `array<object>` | 否 | Structured facts parsed from extracted pages, such as weather forecast values. |  |

### `WebResearchRequest`

- Type：`object`
- Required：`query`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `query` | `string` | 是 | Search query passed to the configured Hermes web backend. Example: OpenAI Codex CLI documentation. | minLength=1; maxLength=500 |
| `top_k` | `anyOf(integer, null)` | 否 | Maximum search results to request. Defaults to HERMES_MAX_SEARCH_RESULTS. |  |
| `extract_pages` | `anyOf(integer, null)` | 否 | Number of top search result pages to extract as Markdown. Defaults to HERMES_EXTRACT_MAX_PAGES. |  |

### `WebResearchSearchResult`

- Type：`object`
- Required：`title`, `url`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `title` | `string` | 是 | Search result title. |  |
| `url` | `string` | 是 | Canonical result URL. |  |
| `snippet` | `anyOf(string, null)` | 否 | Result summary or snippet. |  |
| `source` | `anyOf(string, null)` | 否 | Source site or domain when provided by Hermes. |  |
| `published_at` | `anyOf(string, null)` | 否 | Publication date when provided by the backend. |  |

### `WebsocketBootstrapPublic`

- Type：`object`
- Required：`token`, `ws_path`, `expires_in`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `token` | `string` | 是 |  |  |
| `ws_path` | `string` | 是 |  |  |
| `expires_in` | `integer` | 是 |  |  |
| `model_name` | `anyOf(string, null)` | 否 |  |  |

### `WorkflowPluginPublicationCreate`

- Type：`object`
- Required：`workflow_app_id`, `workflow_version_id`, `organization_id`, `version`, `name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `workflow_app_id` | `string` | 是 |  | maxLength=128; pattern=^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$ |
| `workflow_version_id` | `string` | 是 |  | maxLength=128; pattern=^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$ |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `version` | `string` | 是 |  | maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `icon` | `anyOf(string, null)` | 否 |  |  |
| `opening_statement` | `anyOf(string, null)` | 否 |  |  |
| `suggested_questions` | `array<string>` | 否 |  | maxItems=8 |
| `idempotency_key` | `anyOf(string, null)` | 否 |  |  |
| `activate_immediately` | `boolean` | 否 | If False, the installation is created as DISABLED and will not appear in the catalog until approved. | default=True |

### `WorkflowPluginPublicationPublic`

- Type：`object`
- Required：`id`, `organization_id`, `workflow_app_id`, `workflow_version_id`, `name`, `version`, `idempotency_key`, `status`, `retry_count`, `trace_id`, `created_by`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string (uuid)` | 是 |  |  |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `workflow_app_id` | `string` | 是 |  |  |
| `workflow_version_id` | `string` | 是 |  |  |
| `plugin_definition_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `plugin_version_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `installation_id` | `anyOf(string (uuid), null)` | 否 |  |  |
| `plugin_id` | `anyOf(string, null)` | 否 |  |  |
| `name` | `string` | 是 |  |  |
| `version` | `string` | 是 |  |  |
| `idempotency_key` | `string` | 是 |  |  |
| `status` | `anyOf(`WorkflowPublicationStatus`, string)` | 是 |  |  |
| `current_step` | `anyOf(string, null)` | 否 |  |  |
| `retry_count` | `integer` | 是 |  |  |
| `trace_id` | `string` | 是 |  |  |
| `runtime_mode` | `string (mock, workflow_runtime)` | 否 |  | default=workflow_runtime |
| `last_error` | `anyOf(object, null)` | 否 |  |  |
| `created_by` | `string (uuid)` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |
| `published_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `last_synced_at` | `anyOf(string (date-time), null)` | 否 |  |  |

### `WorkflowPluginPublicationsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`WorkflowPluginPublicationPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `WorkflowPluginRollbackRequest`

- Type：`object`
- Required：`target_workflow_version_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `target_workflow_version_id` | `string` | 是 |  | maxLength=128; pattern=^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$ |

### `WorkflowPublicationStatus`

- Type：`string (pending, publishing, published, superseded, failed, disabled, rolled_back, archived)`

- Enum：`pending`, `publishing`, `published`, `superseded`, `failed`, `disabled`, `rolled_back`, `archived`

### `WorkflowRuntimeBindingCreate`

- Type：`object`
- Required：`organization_id`, `actor_id`, `workflow_app_id`, `version`, `name`, `release_id`, `container_name`, `container_id`, `network_name`, `network_alias`, `container_port`, `upstream_url`, `health_url`, `prediction_path`, `image`, `image_digest`, `artifact_sha256`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `organization_id` | `string (uuid)` | 是 |  |  |
| `actor_id` | `string (uuid)` | 是 |  |  |
| `workflow_app_id` | `string` | 是 |  | maxLength=128; pattern=^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$ |
| `version` | `string` | 是 |  | maxLength=64; pattern=^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$ |
| `name` | `string` | 是 |  | minLength=1; maxLength=255 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `icon` | `anyOf(string, null)` | 否 |  |  |
| `opening_statement` | `anyOf(string, null)` | 否 |  |  |
| `suggested_questions` | `array<string>` | 否 |  | maxItems=8 |
| `release_id` | `string (uuid)` | 是 |  |  |
| `container_name` | `string` | 是 |  | maxLength=128; pattern=^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ |
| `container_id` | `string` | 是 |  | maxLength=128; pattern=^[a-f0-9]{12,128}$ |
| `network_name` | `string` | 是 |  | maxLength=128; pattern=^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ |
| `network_alias` | `string` | 是 |  | maxLength=63; pattern=^[a-z0-9][a-z0-9-]{0,62}$ |
| `container_port` | `integer` | 是 |  | minimum=1.0; maximum=65535.0 |
| `upstream_url` | `string` | 是 |  | minLength=1; maxLength=2048 |
| `health_url` | `string` | 是 |  | minLength=1; maxLength=2048 |
| `prediction_path` | `string` | 是 |  | maxLength=1024; pattern=^/ |
| `image` | `string` | 是 |  | maxLength=512; pattern=^[A-Za-z0-9][A-Za-z0-9._/@:+-]{0,511}$ |
| `image_digest` | `string` | 是 |  | maxLength=71 |
| `artifact_sha256` | `string` | 是 |  | maxLength=64; pattern=^[0-9a-fA-F]{64}$ |
| `healthy` | `boolean` | 否 |  | default=False |

### `WorkflowRuntimeConfigPublic`

- Type：`object`
- Required：`workflow_app_id`, `workflow_version_id`, `plugin_id`, `name`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `workflow_app_id` | `string` | 是 |  |  |
| `workflow_version_id` | `string` | 是 |  |  |
| `plugin_id` | `string` | 是 |  |  |
| `name` | `string` | 是 |  |  |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `icon` | `anyOf(string, null)` | 否 |  |  |
| `opening_statement` | `anyOf(string, null)` | 否 |  |  |
| `suggested_questions` | `array<string>` | 否 |  |  |
| `runtime_mode` | `string (mock, workflow_runtime)` | 否 |  | default=workflow_runtime |
| `card_schema_versions` | `array<string>` | 否 |  |  |
| `artifact_schema_versions` | `array<string>` | 否 |  |  |

### `WorkflowRuntimeConversationListPublic`

- Type：`object`
- Required：`conversations`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `conversations` | `array<`WorkflowRuntimeConversationPublic`>` | 是 |  |  |

### `WorkflowRuntimeConversationMessagesPublic`

- Type：`object`
- Required：`conversation_id`, `messages`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `conversation_id` | `string` | 是 |  |  |
| `messages` | `array<`WorkflowRuntimeHistoryMessagePublic`>` | 是 |  |  |

### `WorkflowRuntimeConversationPublic`

- Type：`object`
- Required：`id`, `title`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  |  |
| `title` | `string` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `WorkflowRuntimeDataTableArtifactPublic`

- Type：`object`
- Required：`id`, `title`, `type`, `columns`, `rows`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `type` | `string` | 是 |  |  |
| `columns` | `array<`WorkflowRuntimeTableColumnPublic`>` | 是 |  | minItems=1; maxItems=6 |
| `rows` | `array<`WorkflowRuntimeTableRowPublic`>` | 是 |  | maxItems=20 |

### `WorkflowRuntimeExternalLinkCardPublic`

- Type：`object`
- Required：`id`, `title`, `kind`, `destination`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `icon_key` | `anyOf(string, null)` | 否 |  |  |
| `cta_label` | `anyOf(string, null)` | 否 |  |  |
| `badge` | `anyOf(string, null)` | 否 |  |  |
| `kind` | `string` | 是 |  |  |
| `destination` | ``WorkflowRuntimeExternalLinkDestination`` | 是 |  |  |

### `WorkflowRuntimeExternalLinkDestination`

- Type：`object`
- Required：`url`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `url` | `string` | 是 |  | minLength=1; maxLength=2048 |

### `WorkflowRuntimeHistoryMessagePublic`

- Type：`object`
- Required：`id`, `role`, `content`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  |  |
| `role` | `string (user, assistant)` | 是 |  |  |
| `content` | `string` | 是 |  |  |
| `cards` | `array<oneOf(`WorkflowRuntimePortalRouteCardPublic`, `WorkflowRuntimeExternalLinkCardPublic`)>` | 否 |  | maxItems=4 |
| `artifacts` | `array<oneOf(`WorkflowRuntimeTodoListArtifactPublic`, `WorkflowRuntimeDataTableArtifactPublic`, `WorkflowRuntimeKeyValueArtifactPublic`, `WorkflowRuntimeTimelineArtifactPublic`, `WorkflowRuntimeRecordListArtifactPublic`)>` | 否 |  | maxItems=4 |
| `interactions` | `array<`WorkflowRuntimeInteractionPublic`>` | 否 |  | maxItems=8 |
| `created_at` | `string (date-time)` | 是 |  |  |

### `WorkflowRuntimeInteractionAttachment`

- Type：`object`
- Required：`attachment_ref`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `attachment_ref` | `string` | 是 |  | minLength=16; maxLength=255 |
| `original_name` | `anyOf(string, null)` | 否 |  |  |

### `WorkflowRuntimeInteractionPublic`

- Type：`object`
- Required：`schema_version`, `id`, `kind`, `status`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 是 |  |  |
| `id` | `string (uuid)` | 是 |  |  |
| `kind` | `string (file_upload, submit_confirmation)` | 是 |  |  |
| `status` | `string (pending, completed, modified, cancelled, expired)` | 是 |  |  |
| `purpose` | `anyOf(string, null)` | 否 |  |  |
| `constraints` | `object` | 否 |  |  |
| `summary` | `anyOf(object, string, null)` | 否 |  |  |

### `WorkflowRuntimeInteractionResponse`

- Type：`object`
- Required：`schema_version`, `interaction_id`, `action`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | `string` | 是 |  |  |
| `interaction_id` | `string (uuid)` | 是 |  |  |
| `action` | `string (complete, confirm, modify, cancel)` | 是 |  |  |
| `attachments` | `array<`WorkflowRuntimeInteractionAttachment`>` | 否 |  | maxItems=1 |

### `WorkflowRuntimeKeyValueArtifactPublic`

- Type：`object`
- Required：`id`, `title`, `type`, `items`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `type` | `string` | 是 |  |  |
| `items` | `array<`WorkflowRuntimeKeyValueItemPublic`>` | 是 |  | minItems=1; maxItems=12 |

### `WorkflowRuntimeKeyValueItemPublic`

- Type：`object`
- Required：`key`, `label`, `value`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `format` | `string (text, number, currency, date, status)` | 否 |  | default=text |
| `currency` | `anyOf(string, null)` | 否 |  |  |
| `key` | `string` | 是 |  | minLength=1; maxLength=40; pattern=^[A-Za-z0-9._-]+$ |
| `label` | `string` | 是 |  | minLength=1; maxLength=160 |
| `value` | `anyOf(string, integer, number, boolean, null)` | 是 |  |  |

### `WorkflowRuntimeMessageCreate`

- Type：`object`
- Required：`request_id`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `message` | `string` | 否 |  | default=; maxLength=20000 |
| `conversation_id` | `anyOf(string, null)` | 否 |  |  |
| `request_id` | `string` | 是 |  | minLength=8; maxLength=128 |
| `locale` | `string (en, ar)` | 否 |  | default=en |
| `interaction_response` | `anyOf(`WorkflowRuntimeInteractionResponse`, null)` | 否 |  |  |

### `WorkflowRuntimeMessagePublic`

- Type：`object`
- Required：`request_id`, `conversation_id`, `workflow_app_id`, `workflow_version_id`, `answer`, `simulated`, `created_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `request_id` | `string` | 是 |  |  |
| `conversation_id` | `string` | 是 |  |  |
| `workflow_app_id` | `string` | 是 |  |  |
| `workflow_version_id` | `string` | 是 |  |  |
| `answer` | `string` | 是 |  |  |
| `cards` | `array<oneOf(`WorkflowRuntimePortalRouteCardPublic`, `WorkflowRuntimeExternalLinkCardPublic`)>` | 否 |  | maxItems=4 |
| `artifacts` | `array<oneOf(`WorkflowRuntimeTodoListArtifactPublic`, `WorkflowRuntimeDataTableArtifactPublic`, `WorkflowRuntimeKeyValueArtifactPublic`, `WorkflowRuntimeTimelineArtifactPublic`, `WorkflowRuntimeRecordListArtifactPublic`)>` | 否 |  | maxItems=4 |
| `interactions` | `array<`WorkflowRuntimeInteractionPublic`>` | 否 |  | maxItems=8 |
| `simulated` | `boolean` | 是 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |

### `WorkflowRuntimePortalRouteCardPublic`

- Type：`object`
- Required：`id`, `title`, `kind`, `destination`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `icon_key` | `anyOf(string, null)` | 否 |  |  |
| `cta_label` | `anyOf(string, null)` | 否 |  |  |
| `badge` | `anyOf(string, null)` | 否 |  |  |
| `kind` | `string` | 是 |  |  |
| `destination` | ``WorkflowRuntimePortalRouteDestination`` | 是 |  |  |

### `WorkflowRuntimePortalRouteDestination`

- Type：`object`
- Required：`route_key`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `route_key` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[a-z0-9._-]+$ |

### `WorkflowRuntimeRecordFieldPublic`

- Type：`object`
- Required：`key`, `label`, `value`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `format` | `string (text, number, currency, date, status)` | 否 |  | default=text |
| `currency` | `anyOf(string, null)` | 否 |  |  |
| `key` | `string` | 是 |  | minLength=1; maxLength=40; pattern=^[A-Za-z0-9._-]+$ |
| `label` | `string` | 是 |  | minLength=1; maxLength=160 |
| `value` | `anyOf(string, integer, number, boolean, null)` | 是 |  |  |
| `tone` | `string (default, muted, success, warning, danger)` | 否 |  | default=default |

### `WorkflowRuntimeRecordItemPublic`

- Type：`object`
- Required：`id`, `title`, `fields`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=160 |
| `fields` | `array<`WorkflowRuntimeRecordFieldPublic`>` | 是 |  | minItems=1; maxItems=12 |

### `WorkflowRuntimeRecordListArtifactPublic`

- Type：`object`
- Required：`id`, `title`, `type`, `items`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `type` | `string` | 是 |  |  |
| `items` | `array<`WorkflowRuntimeRecordItemPublic`>` | 是 |  | minItems=1; maxItems=20 |

### `WorkflowRuntimeTableColumnPublic`

- Type：`object`
- Required：`key`, `label`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `format` | `string (text, number, currency, date, status)` | 否 |  | default=text |
| `currency` | `anyOf(string, null)` | 否 |  |  |
| `key` | `string` | 是 |  | minLength=1; maxLength=40; pattern=^[A-Za-z0-9._-]+$ |
| `label` | `string` | 是 |  | minLength=1; maxLength=160 |

### `WorkflowRuntimeTableRowPublic`

- Type：`object`
- Required：`id`, `cells`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `cells` | `object` | 是 |  |  |

### `WorkflowRuntimeTimelineArtifactPublic`

- Type：`object`
- Required：`id`, `title`, `type`, `items`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `type` | `string` | 是 |  |  |
| `items` | `array<`WorkflowRuntimeTimelineItemPublic`>` | 是 |  | minItems=1; maxItems=12 |

### `WorkflowRuntimeTimelineItemPublic`

- Type：`object`
- Required：`id`, `title`, `status`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=160 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `status` | `string (completed, current, upcoming, blocked)` | 是 |  |  |
| `timestamp` | `anyOf(string (date-time), null)` | 否 |  |  |

### `WorkflowRuntimeTodoItemPublic`

- Type：`object`
- Required：`id`, `label`, `status`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `label` | `string` | 是 |  | minLength=1; maxLength=160 |
| `status` | `string (pending, completed, blocked)` | 是 |  |  |
| `detail` | `anyOf(string, null)` | 否 |  |  |

### `WorkflowRuntimeTodoListArtifactPublic`

- Type：`object`
- Required：`id`, `title`, `type`, `items`
- Additional properties：`False`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  | minLength=1; maxLength=64; pattern=^[A-Za-z0-9._-]+$ |
| `title` | `string` | 是 |  | minLength=1; maxLength=120 |
| `description` | `anyOf(string, null)` | 否 |  |  |
| `type` | `string` | 是 |  |  |
| `items` | `array<`WorkflowRuntimeTodoItemPublic`>` | 是 |  | minItems=1; maxItems=12 |

### `WorkOrderDeploymentPublic`

- Type：`object`
- Required：`id`, `user_id`, `work_order_id`, `deployment_type`, `status`, `runtime_root`, `source_path`, `build_path`, `runtime_path`, `data_path`, `logs_path`, `created_at`, `updated_at`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 |  |  |
| `user_id` | `string` | 是 |  |  |
| `work_order_id` | `string` | 是 |  |  |
| `deployment_type` | `string` | 是 |  |  |
| `status` | `string` | 是 |  |  |
| `runtime_root` | `string` | 是 |  |  |
| `source_path` | `string` | 是 |  |  |
| `build_path` | `string` | 是 |  |  |
| `runtime_path` | `string` | 是 |  |  |
| `data_path` | `string` | 是 |  |  |
| `logs_path` | `string` | 是 |  |  |
| `container_name` | `anyOf(string, null)` | 否 |  |  |
| `docker_network` | `anyOf(string, null)` | 否 |  |  |
| `docker_volume` | `anyOf(string, null)` | 否 |  |  |
| `internal_url` | `anyOf(string, null)` | 否 |  |  |
| `public_url` | `anyOf(string, null)` | 否 |  |  |
| `route_host` | `anyOf(string, null)` | 否 |  |  |
| `route_path` | `anyOf(string, null)` | 否 |  |  |
| `image_name` | `anyOf(string, null)` | 否 |  |  |
| `image_tag` | `anyOf(string, null)` | 否 |  |  |
| `last_build_id` | `anyOf(string, null)` | 否 |  |  |
| `last_deployed_at` | `anyOf(string (date-time), null)` | 否 |  |  |
| `error_message` | `anyOf(string, null)` | 否 |  |  |
| `created_at` | `string (date-time)` | 是 |  |  |
| `updated_at` | `string (date-time)` | 是 |  |  |

### `WorkOrderDeploymentsPublic`

- Type：`object`
- Required：`data`, `count`

| Property | Type | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| `data` | `array<`WorkOrderDeploymentPublic`>` | 是 |  |  |
| `count` | `integer` | 是 |  |  |

### `WorkOrderDeploymentStatus`

- Type：`string (pending, generating, staging, validating, building, deploying, running, failed, stopped, deleted)`

- Enum：`pending`, `generating`, `staging`, `validating`, `building`, `deploying`, `running`, `failed`, `stopped`, `deleted`

## 给知识库管理员的导入建议

1. 先按 Tag 和业务域筛选需要开放给 DSH 的接口，不建议把管理员、部署、删除和任意运行时代理接口直接注册为普通 Tool。
2. 对每个要开放的接口补充业务名称、适用角色、必填字段、示例问题、是否只读、是否需要确认以及失败处理规则。
3. 以此文档中的 Path、Method、Operation ID 和 Schema 作为结构化导入依据；若 Swagger 更新，请重新生成快照并比对 SHA-256 与变更记录。
4. DSH 当前的 Tool Gateway 只发布受控接口；本清单是上游完整 Swagger 数据，不等同于 DSH 已经允许调用的接口集合。

---

_Generated from `http://77.242.240.158:18085/api/platform/api/v1/openapi.json`._
