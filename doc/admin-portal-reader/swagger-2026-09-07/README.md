# Admin Reader Swagger Inventory

Generated: 2026-09-06T22:12:38.435Z

Source: http://localhost:18086/swagger/v1/swagger.json

SHA-256: d95dc212d4f85af20f85b344e39be2caa0b0b9450bf4cec3a86dff49316dca3a

Static metadata inventory only. No business operation was invoked. Candidate classes do not establish read-only safety and do not modify the runtime policy. Missing metadata and ambiguous semantics require implementation or authorized page-network review.

## Summary

- 686 paths, 697 operations, 937 schemas.
- Methods: {"GET":409,"POST":269,"PUT":11,"DELETE":8}.
- Classifications: {"read_candidate":312,"existing_allowlist":70,"prohibited_candidate":192,"needs_review":123}.
- Missing operation summaries: 697; missing operation descriptions: 697.
- Unresolved references: 0.
- Existing allowlist entries absent from this Swagger: 1.

`existing_allowlist` records configuration membership, not a new safety certification. `read_candidate` includes GET/HEAD and query-like POST identifiers; even these can have side effects. `prohibited_candidate` is a conservative lexical/method warning and can over-match business nouns. `needs_review` has insufficient metadata. The full JSON contains parameter and request/response schema structure, local schema definitions, and reasons; example/default payload values are omitted.

## Reproduce

```sh
node scripts/scan_reader_swagger.mjs --policy platform-gateway/config/reader-network-policy.json --out-dir doc/admin-portal-reader/swagger-2026-09-07
node --test scripts/test_scan_reader_swagger.mjs
```

The command fetches only the local Swagger document using GET and refuses redirects. It does not invoke any operation listed in that document. `--input <local-openapi.json>` supports an offline rerun; `--policy` is optional. No runtime policy is generated or overwritten.

## Unmapped Allowlist Entries

| Method | Path |
| --- | --- |
| GET | /api/serviceInfo/GetAllUserType |

Unmapped entries are not automatically removed: this Swagger may omit routes or differ from the deployed portal API. Compare the implementation or authorized page requests before editing policy.

## Approximate Schema Mappings

These mappings prevent false missing-route reports. They do not mean the full Swagger template is allowed: a concrete path can cover only one parameter value, and runtime colon placeholders may impose additional value constraints. Only exact method/path matches receive the `existing_allowlist` classification.

| Method | Policy Path | Swagger Path | Match Kind |
| --- | --- | --- | --- |
| GET | /api/TypeDictionary/GetTypeDictionaries/ServiceConfigServiceType | /api/TypeDictionary/GetTypeDictionaries/{scope} | concrete_path_under_swagger_template |
| GET | /api/TypeDictionary/GetTypeDictionaries/CertificateStatus | /api/TypeDictionary/GetTypeDictionaries/{scope} | concrete_path_under_swagger_template |
| GET | /api/Application/MyReviewDetail/:taskId | /api/Application/MyReviewDetail/{taskId} | template_shape_only |
| GET | /api/UserManagement/UserProfile/:id/Personal | /api/UserManagement/UserProfile/{id}/Personal | template_shape_only |
| GET | /api/UserManagement/UserProfile/:id/Establishment | /api/UserManagement/UserProfile/{id}/Establishment | template_shape_only |
| GET | /api/UserManagement/UserProfile/:id/Partners | /api/UserManagement/UserProfile/{profileId}/Partners | template_shape_only |
| GET | /api/LicenseManagement/:id | /api/LicenseManagement/{id} | template_shape_only |

## Runtime Boundary

This inventory does not enable or disable enforcement. The local runtime switch and hand-maintained policy are managed separately. Disabling the method/path whitelist is a business-validation override, not read-only certification; other action, origin and navigation checks do not prove that every automatically issued API request is safe. No candidate classifications are automatically promoted into the policy.

## Operations

| Method | Path | Classification | Heuristic | Tags | Request Body | Responses |
| --- | --- | --- | --- | --- | --- | --- |
| GET | /api/adcustoms/application-status | read_candidate | read_candidate | CustomerInternal | no | 200 |
| GET | /api/admin/application/{applicationId} | read_candidate | read_candidate | Payments | no | 200 |
| GET | /api/admin/finance/lookups/payment-methods | existing_allowlist | read_candidate | Lookup | no | 200 |
| GET | /api/admin/finance/lookups/transaction-statuses | existing_allowlist | read_candidate | Lookup | no | 200 |
| GET | /api/admin/finance/lookups/transaction-types | existing_allowlist | read_candidate | Lookup | no | 200 |
| GET | /api/admin/finance/recharges | read_candidate | read_candidate | Payments | no | 200 |
| GET | /api/admin/finance/recharges/export | prohibited_candidate | prohibited_candidate | Payments | no | 200 |
| GET | /api/admin/finance/recharges/statistics | read_candidate | read_candidate | Payments | no | 200 |
| GET | /api/admin/finance/transactions | existing_allowlist | read_candidate | Finance | no | 200 |
| GET | /api/admin/finance/transactions/{transactionNo} | read_candidate | read_candidate | Finance | no | 200 |
| GET | /api/admin/finance/transactions/by-user-profile | read_candidate | read_candidate | Finance | no | 200 |
| GET | /api/admin/finance/transactions/export | prohibited_candidate | prohibited_candidate | Finance | no | 200 |
| GET | /api/admin/finance/transactions/payment-method-statistics | existing_allowlist | read_candidate | Finance | no | 200 |
| GET | /api/admin/finance/transactions/statistics | existing_allowlist | read_candidate | Finance | no | 200 |
| GET | /api/admin/finance/transactions/summary-by-user-profile | read_candidate | read_candidate | Finance | no | 200 |
| GET | /api/admin/inspection/appeals/{appealId} | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/cancel-all | prohibited_candidate | prohibited_candidate | InspectionAppeal | yes | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/change-status | needs_review | needs_review | InspectionAppeal | yes | 200 |
| GET | /api/admin/inspection/appeals/{appealId}/messages | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/messages/internal-note | needs_review | needs_review | InspectionAppeal | yes | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/messages/reply-to-customer | needs_review | needs_review | InspectionAppeal | yes | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/process | needs_review | needs_review | InspectionAppeal | yes | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/refunds/retry | needs_review | needs_review | InspectionAppeal | no | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/send-back | prohibited_candidate | prohibited_candidate | InspectionAppeal | yes | 200 |
| GET | /api/admin/inspection/appeals/{appealId}/timeline | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/{appealId}/violation-items | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| POST | /api/admin/inspection/appeals/{appealId}/violation-items | needs_review | needs_review | InspectionAppeal | yes | 200 |
| GET | /api/admin/inspection/appeals/by-target | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/customer | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/customer-happiness/completed | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/customer-happiness/completed/export | prohibited_candidate | prohibited_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/customer-happiness/stats | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/customer-happiness/todo | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/customer-happiness/todo/export | prohibited_candidate | prohibited_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/departments/completed | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/departments/completed/export | prohibited_candidate | prohibited_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/departments/stats | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/departments/todo | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/appeals/departments/todo/export | prohibited_candidate | prohibited_candidate | InspectionAppeal | no | 200 |
| GET | /api/admin/inspection/books/lookup-by-isbn | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/access-failed-reasons | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/activities | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/activities/{id} | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/activities/{id}/activity-based-input | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/appeal-reasons | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/appeal-statuses | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/checklist-results | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/checklist-template-items | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/committee-users | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/content-users | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/declaration-refusal-reasons | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/emirates | existing_allowlist | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/emirates/{emirateId}/authorities | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/emirates/{emirateId}/regions | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/establishment-sub-types | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/establishments | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/establishments/by-trade-license | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/individuals | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/inspection-methods | existing_allowlist | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/inspectors | existing_allowlist | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/languages | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/priorities | existing_allowlist | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/publication-types | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/reasons | existing_allowlist | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/regions/{regionId}/communities | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/seized-material-types | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/source-types | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/target-types | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/task-statuses | existing_allowlist | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/lookup/violation-items | read_candidate | read_candidate | InspectionDictionary | no | 200 |
| GET | /api/admin/inspection/ocr/{scanId} | read_candidate | read_candidate | InspectionOcr | no | 200 |
| POST | /api/admin/inspection/ocr/{scanId}/edit | needs_review | needs_review | InspectionOcr | yes | 200 |
| GET | /api/admin/inspection/ocr/{scanId}/matches | read_candidate | read_candidate | InspectionOcr | no | 200 |
| GET | /api/admin/inspection/ocr/{scanId}/matches2 | read_candidate | read_candidate | InspectionOcr | no | 200 |
| GET | /api/admin/inspection/ocr/{scanId}/slim | read_candidate | read_candidate | InspectionOcr | no | 200 |
| POST | /api/admin/inspection/ocr/content-ai/evaluate | needs_review | needs_review | InspectionOcr | yes | 200, 400 |
| POST | /api/admin/inspection/ocr/scan | needs_review | needs_review | InspectionOcr | yes | 200 |
| GET | /api/admin/inspection/ocr/tasks/{taskId}/results | read_candidate | read_candidate | InspectionOcr | no | 200 |
| GET | /api/admin/inspection/profile/appeal/by-user-profile | read_candidate | read_candidate | InspectionProfile | no | 200 |
| GET | /api/admin/inspection/profile/refunds/by-user-profile | read_candidate | read_candidate | InspectionProfile | no | 200 |
| GET | /api/admin/inspection/profile/task/by-user-profile | read_candidate | read_candidate | InspectionProfile | no | 200 |
| GET | /api/admin/inspection/profile/violation/by-user-profile | read_candidate | read_candidate | InspectionProfile | no | 200 |
| GET | /api/admin/inspection/tasks | existing_allowlist | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks | needs_review | needs_review | InspectionTask | yes | 200 |
| GET | /api/admin/inspection/tasks/{id} | read_candidate | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/{id}/access-failed | needs_review | needs_review | InspectionExecution | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/assign | prohibited_candidate | prohibited_candidate | InspectionTask | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/cancel | prohibited_candidate | prohibited_candidate | InspectionTask | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/checkin | needs_review | needs_review | InspectionExecution | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/checklist | needs_review | needs_review | InspectionExecution | yes | 200 |
| GET | /api/admin/inspection/tasks/{id}/checklist-items | read_candidate | read_candidate | InspectionExecution | no | 200 |
| GET | /api/admin/inspection/tasks/{id}/checklist-template | read_candidate | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/{id}/checkout | needs_review | needs_review | InspectionExecution | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/contact-person | needs_review | needs_review | InspectionExecution | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/contact-person/declaration | needs_review | needs_review | InspectionExecution | yes | 200 |
| GET | /api/admin/inspection/tasks/{id}/digital-presence | read_candidate | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/{id}/duplicate | needs_review | needs_review | InspectionTask | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/edit | needs_review | needs_review | InspectionTask | yes | 200 |
| GET | /api/admin/inspection/tasks/{id}/execution-result | read_candidate | read_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/{id}/last-inspection | read_candidate | read_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/{id}/persons | read_candidate | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/{id}/reinspection | needs_review | needs_review | InspectionExecution | yes | 200 |
| GET | /api/admin/inspection/tasks/{id}/reinspection-task | read_candidate | read_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/{id}/report | read_candidate | read_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/{id}/review | read_candidate | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/{id}/seized-materials | needs_review | needs_review | InspectionExecution | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/start-visit | prohibited_candidate | prohibited_candidate | InspectionExecution | yes | 200 |
| POST | /api/admin/inspection/tasks/{id}/submit-report | prohibited_candidate | prohibited_candidate | InspectionExecution | yes | 200 |
| GET | /api/admin/inspection/tasks/{id}/target-overview | read_candidate | read_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/{id}/timeline | read_candidate | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/auto-assign/trigger | prohibited_candidate | prohibited_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/auto-schedule/trigger | needs_review | needs_review | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/batch-assign | prohibited_candidate | prohibited_candidate | InspectionTask | yes | 200 |
| POST | /api/admin/inspection/tasks/batch-by-activity | needs_review | needs_review | InspectionTask | yes | 200 |
| GET | /api/admin/inspection/tasks/by-target | read_candidate | read_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/created-by-users | read_candidate | read_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/export | prohibited_candidate | prohibited_candidate | InspectionTask | no | 200 |
| GET | /api/admin/inspection/tasks/stats | existing_allowlist | read_candidate | InspectionTask | no | 200 |
| POST | /api/admin/inspection/tasks/validate | read_candidate | read_candidate | InspectionTask | yes | 200 |
| GET | /api/admin/inspection/violations | read_candidate | read_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/inspection/violations/{id} | read_candidate | read_candidate | InspectionViolation | no | 200 |
| POST | /api/admin/inspection/violations/{id}/approval | needs_review | needs_review | InspectionViolation | no | 200 |
| POST | /api/admin/inspection/violations/{id}/content-report | needs_review | needs_review | InspectionViolation | yes | 200 |
| POST | /api/admin/inspection/violations/{id}/decide | needs_review | needs_review | InspectionViolation | yes | 200 |
| GET | /api/admin/inspection/violations/{id}/penalty-standard | read_candidate | read_candidate | InspectionViolation | no | 200 |
| POST | /api/admin/inspection/violations/{id}/route | needs_review | needs_review | InspectionViolation | yes | 200 |
| GET | /api/admin/inspection/violations/{id}/target-overview | read_candidate | read_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/inspection/violations/{id}/timeline | read_candidate | read_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/inspection/violations/{violationId}/appeal | read_candidate | read_candidate | InspectionAppeal | no | 200 |
| POST | /api/admin/inspection/violations/{violationId}/appeal/decide | needs_review | needs_review | InspectionAppeal | yes | 200 |
| GET | /api/admin/inspection/violations/by-target | read_candidate | read_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/inspection/violations/by-violation-no/{violationNo}/penalty-order | read_candidate | read_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/inspection/violations/customer | read_candidate | read_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/inspection/violations/export | prohibited_candidate | prohibited_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/inspection/violations/stats | read_candidate | read_candidate | InspectionViolation | no | 200 |
| GET | /api/admin/payments/refunds | read_candidate | read_candidate | AdminPaymentsRefunds | no | 200 |
| GET | /api/admin/payments/refunds/{refundNo} | prohibited_candidate | prohibited_candidate | AdminPaymentsRefunds | no | 200 |
| POST | /api/admin/payments/refunds/{refundNo}/execute | prohibited_candidate | prohibited_candidate | AdminPaymentsRefunds | yes | 200 |
| GET | /api/admin/payments/refunds/statistics | read_candidate | read_candidate | AdminPaymentsRefunds | no | 200 |
| GET | /api/admin/services/{serviceId}/engine-config | read_candidate | read_candidate | ServiceEngineConfiguration | no | 200 |
| PUT | /api/admin/services/{serviceId}/engine-config | prohibited_candidate | prohibited_candidate | ServiceEngineConfiguration | yes | 200 |
| GET | /api/admin/services/{serviceId}/engine-config/fee/readiness | read_candidate | read_candidate | ServiceEngineConfiguration | no | 200 |
| GET | /api/admin/services/{serviceId}/engine-config/penalty/readiness | read_candidate | read_candidate | ServiceEngineConfiguration | no | 200 |
| GET | /api/admin/services/{serviceId}/engine-config/readiness | read_candidate | read_candidate | ServiceEngineConfiguration | no | 200 |
| GET | /api/admin/services/{serviceId}/engine-config/rule/readiness | read_candidate | read_candidate | ServiceEngineConfiguration | no | 200 |
| GET | /api/admin/services/{serviceId}/engine-config/status | read_candidate | read_candidate | ServiceEngineConfiguration | no | 200 |
| GET | /api/admin/services/{serviceId}/engine-config/versions | read_candidate | read_candidate | ServiceEngineConfiguration | no | 200 |
| POST | /api/AdminFahr/Applications/{applicationId}/ApplyTransaction | needs_review | needs_review | Fahr | yes | 200, 400 |
| POST | /api/AdminFahr/Applications/{applicationId}/ExternalApproval | needs_review | needs_review | Fahr | yes | 200, 400 |
| GET | /api/AdminFahr/Applications/{applicationId}/ExternalApprovalEligibility | read_candidate | read_candidate | Fahr | no | 200 |
| POST | /api/AdminFahr/Applications/{applicationId}/ExternalReviewDecision | needs_review | needs_review | Fahr | yes | 200, 400 |
| GET | /api/AdminFahr/Applications/{applicationId}/ExternalReviewReadiness | read_candidate | read_candidate | Fahr | no | 200 |
| GET | /api/AdminFahr/Applications/{applicationId}/FahrStatus | read_candidate | read_candidate | Fahr | no | 200 |
| POST | /api/AdminFahr/Applications/{applicationId}/ModifyAfterApproval | prohibited_candidate | prohibited_candidate | Fahr | yes | 200, 400 |
| GET | /api/AdminFahr/Applications/{applicationId}/Persons/{personRefId}/FahrStatus | read_candidate | read_candidate | Fahr | no | 200 |
| POST | /api/AdminFahr/Applications/{applicationId}/UnapplyTransaction | needs_review | needs_review | Fahr | yes | 200, 400 |
| GET | /api/AdminFahr/Permits/{permitId}/Download | prohibited_candidate | prohibited_candidate | Fahr | no | 200, 404 |
| POST | /api/AdminFahr/Review/CancelTransaction | prohibited_candidate | prohibited_candidate | Fahr | yes | 200, 400 |
| POST | /api/AdminFahr/Review/ManualDecision | needs_review | needs_review | Fahr | yes | 200 |
| GET | /api/AdminFahr/Review/Requests | read_candidate | read_candidate | Fahr | no | 200 |
| GET | /api/AdminFahr/Review/Requests/{requestId} | read_candidate | read_candidate | Fahr | no | 200 |
| POST | /api/AdminFahr/Review/SupplementaryMaterials | needs_review | needs_review | Fahr | yes | 200, 400 |
| GET | /api/AdminUser/EmailExsit | read_candidate | read_candidate | AdminUser | no | 200 |
| POST | /api/AdminUser/ForgetPassWord | needs_review | needs_review | AdminUser | yes | 200 |
| POST | /api/AdminUser/GetGenerateCode | prohibited_candidate | prohibited_candidate | AdminUser | yes | 200 |
| POST | /api/AdminUser/GetUserInfo | existing_allowlist | read_candidate | AdminUser | no | 200 |
| POST | /api/AdminUser/Login | prohibited_candidate | prohibited_candidate | AdminUser | yes | 200 |
| GET | /api/AdminUser/LoginMethod | existing_allowlist | prohibited_candidate | AdminUser | no | 200 |
| POST | /api/AdminUser/UAEPass/CallBackGetTokenByCode | read_candidate | read_candidate | AdminUser | yes | 200 |
| GET | /api/AdminUser/UAEPass/GetUserInfo | read_candidate | read_candidate | AdminUser | no | 200 |
| GET | /api/AdminUser/UAEPass/Login | prohibited_candidate | prohibited_candidate | AdminUser | no | 200 |
| POST | /api/AdminUser/VerificationCode | needs_review | needs_review | AdminUser | yes | 200 |
| GET | /api/Application/{applicationId}/photography-documents/download | prohibited_candidate | prohibited_candidate | Application | no | 200 |
| POST | /api/Application/{applicationId}/recall-approval | needs_review | needs_review | Application | yes | 200 |
| GET | /api/Application/{applicationId}/recall-approval/eligibility | read_candidate | read_candidate | Application | no | 200 |
| GET | /api/Application/{applicationId}/recall-approval/status | read_candidate | read_candidate | Application | no | 200 |
| GET | /api/Application/ApplicantDetailByApplicationId | read_candidate | read_candidate | Application | no | 200 |
| POST | /api/Application/ApplicationPageByProfile | read_candidate | read_candidate | Application | yes | 200 |
| POST | /api/Application/ApproveV2 | prohibited_candidate | prohibited_candidate | Application | yes | 200 |
| GET | /api/Application/dashboard/service/list | existing_allowlist | read_candidate | Application | no | 200 |
| GET | /api/Application/dashboard/service/list/export | prohibited_candidate | prohibited_candidate | Application | no | 200 |
| GET | /api/Application/dashboard/statistics | existing_allowlist | read_candidate | Application | no | 200 |
| GET | /api/Application/dashboard/team/list | existing_allowlist | read_candidate | Application | no | 200 |
| GET | /api/Application/dashboard/team/list/export | prohibited_candidate | prohibited_candidate | Application | no | 200 |
| POST | /api/Application/ExportMyCompletedReview | prohibited_candidate | prohibited_candidate | Application | yes | 200 |
| POST | /api/Application/ExportMyTeamCompletedReview | prohibited_candidate | prohibited_candidate | Application | yes | 200 |
| POST | /api/Application/ExportMyTeamTodoReview | prohibited_candidate | prohibited_candidate | Application | yes | 200 |
| POST | /api/Application/ExportMyTodoReview | prohibited_candidate | prohibited_candidate | Application | yes | 200 |
| GET | /api/Application/IsLeader | read_candidate | read_candidate | Application | no | 200 |
| POST | /api/Application/MyComplatedPage | existing_allowlist | read_candidate | Application | yes | 200 |
| GET | /api/Application/MyReviewDetail/{taskId} | read_candidate | read_candidate | Application | no | 200 |
| POST | /api/Application/MyTeamComplatedPage | read_candidate | read_candidate | Application | yes | 200 |
| POST | /api/Application/MyTeamMemberTask | needs_review | needs_review | Application | yes | 200 |
| POST | /api/Application/MyTeamTodoPage | read_candidate | read_candidate | Application | yes | 200 |
| POST | /api/Application/MyTodoPage | existing_allowlist | read_candidate | Application | yes | 200 |
| GET | /api/Application/UrgenCount | existing_allowlist | read_candidate | Application | no | 200 |
| POST | /api/applications/{applicationId}/disposition-submissions | needs_review | needs_review | DispositionCase | yes | 200 |
| POST | /api/AzureAD/CallBackGetTokenByCode | read_candidate | read_candidate | AzureAD | yes | 200 |
| GET | /api/AzureAD/GetAzureADLoginURL | prohibited_candidate | prohibited_candidate | AzureAD | no | 200 |
| GET | /api/AzureAD/GetUserInfo | read_candidate | read_candidate | AzureAD | no | 200 |
| GET | /api/AzureAD/GetUserInfoToLogin | prohibited_candidate | prohibited_candidate | AzureAD | no | 200 |
| PUT | /api/CamundaTask/AssignmentTaskUser | prohibited_candidate | prohibited_candidate | CamundaTask | yes | 200 |
| POST | /api/CamundaTask/ExternalApprovalAction | needs_review | needs_review | CamundaTask | yes | 200 |
| GET | /api/CamundaTask/GetCamundaTasks | read_candidate | read_candidate | CamundaTask | no | 200 |
| GET | /api/CamundaTask/GetInstanceTask/{taskId} | read_candidate | read_candidate | CamundaTask | no | 200 |
| GET | /api/CamundaTask/GetInstanceToDoTask/{instanceId} | read_candidate | read_candidate | CamundaTask | no | 200 |
| GET | /api/CamundaTask/GetProcessInstance/{processInstanceId} | read_candidate | read_candidate | CamundaTask | no | 200 |
| GET | /api/CamundaTask/GetSendBackFallbackNodes | prohibited_candidate | prohibited_candidate | CamundaTask | no | 200 |
| POST | /api/CamundaTask/StartWorkflow | prohibited_candidate | prohibited_candidate | CamundaTask | yes | 200 |
| POST | /api/CamundaTask/TaskApprovalAction | needs_review | needs_review | CamundaTask | no | 410 |
| POST | /api/CamundaTask/TaskRejectionInitiator | needs_review | needs_review | CamundaTask | no | 410 |
| POST | /api/CamundaTask/TaskSendBack | prohibited_candidate | prohibited_candidate | CamundaTask | yes | 200 |
| POST | /api/CamundaTask/UpdateProcessInstanceStatus | prohibited_candidate | prohibited_candidate | CamundaTask | no | 410 |
| GET | /api/ComplianceLegal | read_candidate | read_candidate | ComplianceLegal | no | 200 |
| POST | /api/ComplianceLegal | needs_review | needs_review | ComplianceLegal | yes | 200 |
| PUT | /api/ComplianceLegal | prohibited_candidate | prohibited_candidate | ComplianceLegal | yes | 200 |
| DELETE | /api/ComplianceLegal/{id} | prohibited_candidate | prohibited_candidate | ComplianceLegal | no | 200 |
| GET | /api/ComplianceLegal/{id} | read_candidate | read_candidate | ComplianceLegal | no | 200 |
| GET | /api/ComplianceLegal/policy-type/{policyType} | read_candidate | read_candidate | ComplianceLegal | no | 200 |
| POST | /api/ComplianceLegal/search | read_candidate | read_candidate | ComplianceLegal | yes | 200 |
| POST | /api/Content/ApproveV2 | prohibited_candidate | prohibited_candidate | Content | yes | 200 |
| GET | /api/Content/Dashboard/Overview | existing_allowlist | read_candidate | ContentDashboard | no | 200 |
| GET | /api/Content/dashboard/service/list | read_candidate | read_candidate | Content | no | 200 |
| GET | /api/Content/dashboard/service/list/export | prohibited_candidate | prohibited_candidate | Content | no | 200 |
| GET | /api/Content/dashboard/statistics | read_candidate | read_candidate | Content | no | 200 |
| GET | /api/Content/Dashboard/TaskList | existing_allowlist | read_candidate | ContentDashboard | no | 200 |
| GET | /api/Content/dashboard/team/list | read_candidate | read_candidate | Content | no | 200 |
| GET | /api/Content/dashboard/team/list/export | prohibited_candidate | prohibited_candidate | Content | no | 200 |
| POST | /api/Content/ExportMyCompletedReview | prohibited_candidate | prohibited_candidate | Content | yes | 200 |
| POST | /api/Content/ExportMyTeamCompletedReview | prohibited_candidate | prohibited_candidate | Content | yes | 200 |
| POST | /api/Content/ExportMyTeamTodoReview | prohibited_candidate | prohibited_candidate | Content | yes | 200 |
| POST | /api/Content/ExportMyTodoReview | prohibited_candidate | prohibited_candidate | Content | yes | 200 |
| GET | /api/Content/IsLeader | read_candidate | read_candidate | Content | no | 200 |
| POST | /api/Content/MyComplatedPage | read_candidate | read_candidate | Content | yes | 200 |
| GET | /api/Content/MyReviewDetail/{taskId} | read_candidate | read_candidate | Content | no | 200 |
| POST | /api/Content/MyTeamComplatedPage | read_candidate | read_candidate | Content | yes | 200 |
| POST | /api/Content/MyTeamMemberTask | needs_review | needs_review | Content | yes | 200 |
| POST | /api/Content/MyTeamTodoPage | read_candidate | read_candidate | Content | yes | 200 |
| POST | /api/Content/MyTodoPage | read_candidate | read_candidate | Content | yes | 200 |
| GET | /api/content/team-management/members | read_candidate | read_candidate | ContentTeamManagement | no | 200 |
| GET | /api/content/team-management/members-optimized | read_candidate | read_candidate | ContentTeamManagement | no | 200 |
| POST | /api/content/team-management/members/{userId}/emergency-leave | needs_review | needs_review | ContentTeamManagement | yes | 200 |
| POST | /api/content/team-management/members/{userId}/resume-work | needs_review | needs_review | ContentTeamManagement | no | 200 |
| GET | /api/content/team-management/members/reassignment | read_candidate | read_candidate | ContentTeamManagement | no | 200 |
| POST | /api/content/team-management/members/reassignment/query | read_candidate | read_candidate | ContentTeamManagement | yes | 200 |
| GET | /api/content/team-management/metadata | read_candidate | read_candidate | ContentTeamManagement | no | 200 |
| GET | /api/content/team-management/summary | read_candidate | read_candidate | ContentTeamManagement | no | 200 |
| GET | /api/content/team-management/summary-v2 | read_candidate | read_candidate | ContentTeamManagement | no | 200 |
| POST | /api/content/team-management/tasks/export | prohibited_candidate | prohibited_candidate | ContentTeamManagement | yes | 200 |
| POST | /api/content/team-management/tasks/query | read_candidate | read_candidate | ContentTeamManagement | yes | 200 |
| POST | /api/content/team-management/tasks/query-v2 | read_candidate | read_candidate | ContentTeamManagement | yes | 200 |
| POST | /api/content/team-management/tasks/reassign | prohibited_candidate | prohibited_candidate | ContentTeamManagement | yes | 200 |
| POST | /api/content/team-management/tasks/reassign-v2 | prohibited_candidate | prohibited_candidate | ContentTeamManagement | yes | 200 |
| POST | /api/content/team-management/urgent-task-alerts/run | needs_review | needs_review | ContentTeamManagement | no | 200 |
| GET | /api/Content/UrgenCount | read_candidate | read_candidate | Content | no | 200 |
| POST | /api/ContentLibrary/AddBlockedAuthor | prohibited_candidate | prohibited_candidate | ContentLibrary | yes | 200 |
| POST | /api/ContentLibrary/ChangeBookStatus | needs_review | needs_review | ContentLibrary | yes | 200 |
| POST | /api/ContentLibrary/ChangeCinemaStatus | needs_review | needs_review | ContentLibrary | yes | 200 |
| POST | /api/ContentLibrary/ChangeNewspaperStatus | needs_review | needs_review | ContentLibrary | yes | 200 |
| POST | /api/ContentLibrary/ChangeVideoGamesStatus | needs_review | needs_review | ContentLibrary | yes | 200 |
| GET | /api/ContentLibrary/CinemaExportCSV | prohibited_candidate | prohibited_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/dashboard/list | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/dashboard/list/export | prohibited_candidate | prohibited_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/dashboard/statistics | read_candidate | read_candidate | ContentLibrary | no | 200 |
| DELETE | /api/ContentLibrary/DeleteBlockedAuthor | prohibited_candidate | prohibited_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/ExportCSV | prohibited_candidate | prohibited_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/ExportRegulateEntryItemList | prohibited_candidate | prohibited_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetBlockedAuthorList | read_candidate | read_candidate | ContentLibrary | no | 200 |
| POST | /api/ContentLibrary/GetBookApprovedStatusByIsbns | read_candidate | read_candidate | ContentLibrary | yes | 200 |
| GET | /api/ContentLibrary/GetBookAppsInfoListById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetBookDetailsById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetBookList | existing_allowlist | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetBooksCount | existing_allowlist | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetCinemaAppsInfoListById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetCinemaDetailsById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetCinemaList | existing_allowlist | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetCinemasCount | existing_allowlist | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetCinemaStatusHistoryList/{cinemaId} | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetHistoryList/{bookId} | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetMaterialTypeLookup | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetNewspaperAppsInfoListById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetNewspaperDetailsById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetNewspaperList | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetNewsPapersCount | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetNewspaperStatusHistoryList/{newspaperId} | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetRegulateEntryItemList | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetRegulateEntryItemsCount | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetVideoGamesAppsInfoListById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetVideoGamesCount | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetVideoGamesDetailsById | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetVideoGamesList | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/GetVideoGamesStatusHistoryList/{videoGamesId} | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/Languages | read_candidate | read_candidate | ContentLibrary | no | 200 |
| GET | /api/ContentLibrary/NewspaperExportCSV | prohibited_candidate | prohibited_candidate | ContentLibrary | no | 200 |
| PUT | /api/ContentLibrary/UpdateBlockedAuthor | prohibited_candidate | prohibited_candidate | ContentLibrary | yes | 200 |
| GET | /api/ContentLibrary/VideoGamesExportCSV | prohibited_candidate | prohibited_candidate | ContentLibrary | no | 200 |
| POST | /api/customer-happiness-analytics/customer-insights/summary | read_candidate | read_candidate | CustomerHappinessAnalytics | yes | 200 |
| POST | /api/customer-happiness-analytics/customer-insights/top-customers | needs_review | needs_review | CustomerHappinessAnalytics | yes | 200 |
| POST | /api/customer-happiness-analytics/customer-insights/top-profiles | needs_review | needs_review | CustomerHappinessAnalytics | yes | 200 |
| POST | /api/customer-happiness-analytics/operational-insights/service-satisfaction | needs_review | needs_review | CustomerHappinessAnalytics | yes | 200 |
| POST | /api/customer-happiness-analytics/operational-insights/service-satisfaction/export | prohibited_candidate | prohibited_candidate | CustomerHappinessAnalytics | yes | 200 |
| POST | /api/customer-happiness-analytics/operational-insights/summary | read_candidate | read_candidate | CustomerHappinessAnalytics | yes | 200 |
| POST | /api/customer-happiness-analytics/operational-insights/team-performance | needs_review | needs_review | CustomerHappinessAnalytics | yes | 200 |
| POST | /api/customer-happiness-analytics/operational-insights/team-performance/export | prohibited_candidate | prohibited_candidate | CustomerHappinessAnalytics | yes | 200 |
| GET | /api/customer-happiness/team-management/members | read_candidate | read_candidate | CustomerHappinessTeamManagement | no | 200 |
| GET | /api/customer-happiness/team-management/members-optimized | read_candidate | read_candidate | CustomerHappinessTeamManagement | no | 200 |
| POST | /api/customer-happiness/team-management/members/{userId}/emergency-leave | needs_review | needs_review | CustomerHappinessTeamManagement | yes | 200 |
| POST | /api/customer-happiness/team-management/members/{userId}/resume-work | needs_review | needs_review | CustomerHappinessTeamManagement | no | 200 |
| GET | /api/customer-happiness/team-management/members/reassignment | read_candidate | read_candidate | CustomerHappinessTeamManagement | no | 200 |
| GET | /api/customer-happiness/team-management/metadata | read_candidate | read_candidate | CustomerHappinessTeamManagement | no | 200 |
| GET | /api/customer-happiness/team-management/summary | read_candidate | read_candidate | CustomerHappinessTeamManagement | no | 200 |
| GET | /api/customer-happiness/team-management/summary-v2 | read_candidate | read_candidate | CustomerHappinessTeamManagement | no | 200 |
| POST | /api/customer-happiness/team-management/tasks/export | prohibited_candidate | prohibited_candidate | CustomerHappinessTeamManagement | yes | 200 |
| POST | /api/customer-happiness/team-management/tasks/export-v2 | prohibited_candidate | prohibited_candidate | CustomerHappinessTeamManagement | yes | 200 |
| POST | /api/customer-happiness/team-management/tasks/query | read_candidate | read_candidate | CustomerHappinessTeamManagement | yes | 200 |
| POST | /api/customer-happiness/team-management/tasks/query-v2 | read_candidate | read_candidate | CustomerHappinessTeamManagement | yes | 200 |
| POST | /api/customer-happiness/team-management/tasks/reassign | prohibited_candidate | prohibited_candidate | CustomerHappinessTeamManagement | yes | 200 |
| POST | /api/customer-happiness/team-management/tasks/reassign-v2 | prohibited_candidate | prohibited_candidate | CustomerHappinessTeamManagement | yes | 200 |
| POST | /api/customer-happiness/team-management/urgent-task-alerts/run | needs_review | needs_review | CustomerHappinessTeamManagement | no | 200 |
| GET | /api/CustomerHappiness/Dashboard/Overview | existing_allowlist | read_candidate | CustomerHappinessDashboard | no | 200 |
| GET | /api/CustomerHappiness/Dashboard/TaskList | existing_allowlist | read_candidate | CustomerHappinessDashboard | no | 200 |
| GET | /api/Dashboard/Departments | read_candidate | read_candidate | Dashboard | no | 200 |
| GET | /api/Dashboard/Enquiry/Tasks | read_candidate | read_candidate | Dashboard | no | 200 |
| GET | /api/Departments/Department | read_candidate | read_candidate | Departments | no | 200 |
| POST | /api/Departments/DepartmentAdd | prohibited_candidate | prohibited_candidate | Departments | yes | 200 |
| DELETE | /api/Departments/DepartmentDeleted | prohibited_candidate | prohibited_candidate | Departments | no | 200 |
| PUT | /api/Departments/DepartmentEdit | prohibited_candidate | prohibited_candidate | Departments | yes | 200 |
| GET | /api/Departments/Departments | read_candidate | read_candidate | Departments | no | 200 |
| GET | /api/Departments/DepartmentUsers/{departmentId} | read_candidate | read_candidate | Departments | no | 200 |
| GET | /api/Departments/DepartmentUsers/UserDepartment | read_candidate | read_candidate | Departments | no | 200 |
| POST | /api/disposition-cases/{caseId}/review | needs_review | needs_review | DispositionCase | yes | 200 |
| GET | /api/Document/certificates/{certificateId}/download | prohibited_candidate | prohibited_candidate | Document | no | 200 |
| GET | /api/Document/Dowload | prohibited_candidate | prohibited_candidate | Document | no | 200 |
| POST | /api/Document/OriginalNames | prohibited_candidate | prohibited_candidate | Document | yes | 200 |
| POST | /api/Document/Upload | prohibited_candidate | prohibited_candidate | Document | yes | 200 |
| GET | /api/Enquiry/EnquiryIssueCategory | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/EnquirySource | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/EnquiryStatus | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/EnquiryTypes | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/GetEnquiryAndTicketSLAExceeded | read_candidate | read_candidate | Enquiry | no | 200 |
| PUT | /api/Enquiry/Management/{enquiryId}/Assign | prohibited_candidate | prohibited_candidate | Enquiry | yes | 200 |
| POST | /api/Enquiry/Management/{enquiryId}/ChangeStatus | needs_review | needs_review | Enquiry | yes | 200 |
| POST | /api/Enquiry/Management/{enquiryId}/Conversation | needs_review | needs_review | Enquiry | yes | 200 |
| GET | /api/Enquiry/Management/{enquiryId}/EnquiryInfo | read_candidate | read_candidate | Enquiry | no | 200 |
| POST | /api/Enquiry/Management/{enquiryId}/Process | needs_review | needs_review | Enquiry | yes | 200 |
| POST | /api/Enquiry/Management/{enquiryId}/ProcessedTransfer | prohibited_candidate | prohibited_candidate | Enquiry | yes | 200 |
| GET | /api/Enquiry/Management/{enquiryId}/Timeline | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/Account/Tickets | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/Account/Tickets/StatusCount | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/Application/Task | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/Applications | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/Departments | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/EnquiryInfo/{enquiryId}/Applicants | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/EnquiryInfo/{enquiryId}/Relate | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/EnquiryStatus | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/GetAssigns | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/List | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/List/Export | prohibited_candidate | prohibited_candidate | Enquiry | no | 200 |
| POST | /api/Enquiry/Management/New | needs_review | needs_review | Enquiry | yes | 200 |
| GET | /api/Enquiry/Management/Status/Count | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/TeamMenber/TeamTask | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/TeamTask/List | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/TeamTask/List/Export | prohibited_candidate | prohibited_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/Timeline | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/Management/UserInfo | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/PriorityType | existing_allowlist | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/ProblemCauses | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Enquiry/public/EnquiryInfo | read_candidate | read_candidate | Enquiry | no | 200 |
| GET | /api/Form/AgeRatingPermit | read_candidate | read_candidate | Form | no | 200 |
| GET | /api/Form/CirculationMediaMaterialTitles | read_candidate | read_candidate | Form | no | 200 |
| GET | /api/Form/PosterTrailerPermit | read_candidate | read_candidate | Form | no | 200 |
| POST | /api/inspection-archive/ftp/upload | prohibited_candidate | prohibited_candidate | InspectionArchiveFtp | yes | 200 |
| POST | /api/inspection-archive/ftp/upload-from-storage | prohibited_candidate | prohibited_candidate | InspectionArchiveFtp | yes | 200 |
| GET | /api/Inspection/Dashboard/Overview | existing_allowlist | read_candidate | InspectionDashboard | no | 200 |
| GET | /api/Inspection/Dashboard/TaskList | existing_allowlist | read_candidate | InspectionDashboard | no | 200 |
| GET | /api/inspection/declarations/{token} | read_candidate | read_candidate | InspectionDeclaration | no | 200 |
| POST | /api/inspection/declarations/{token}/contact-person | needs_review | needs_review | InspectionDeclaration | yes | 200 |
| POST | /api/inspection/declarations/{token}/refuse | needs_review | needs_review | InspectionDeclaration | yes | 200 |
| POST | /api/inspection/declarations/{token}/submit | prohibited_candidate | prohibited_candidate | InspectionDeclaration | yes | 200 |
| GET | /api/inspection/reportsAnalytics/breakdownByEmirate | read_candidate | read_candidate | InspectionReportsAnalytics | no | 200 |
| GET | /api/inspection/reportsAnalytics/breakdownByEmirate/export | prohibited_candidate | prohibited_candidate | InspectionReportsAnalytics | no | 200 |
| GET | /api/inspection/reportsAnalytics/operationalInsights | read_candidate | read_candidate | InspectionReportsAnalytics | no | 200 |
| GET | /api/inspection/reportsAnalytics/riskInsights | read_candidate | read_candidate | InspectionReportsAnalytics | no | 200 |
| GET | /api/inspection/reportsAnalytics/teamPerformance | read_candidate | read_candidate | InspectionReportsAnalytics | no | 200 |
| GET | /api/inspection/reportsAnalytics/teamPerformance/export | prohibited_candidate | prohibited_candidate | InspectionReportsAnalytics | no | 200 |
| POST | /api/inspection/team-management/inspection-tasks | needs_review | needs_review | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/inspection-tasks/{id}/cancel | prohibited_candidate | prohibited_candidate | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/inspection-tasks/{id}/duplicate | needs_review | needs_review | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/inspection-tasks/{id}/edit | needs_review | needs_review | InspectionTeamManagement | yes | 200 |
| GET | /api/inspection/team-management/members | existing_allowlist | read_candidate | InspectionTeamManagement | no | 200 |
| POST | /api/inspection/team-management/members/{userId}/assigned-area | needs_review | needs_review | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/members/{userId}/emergency-leave | needs_review | needs_review | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/members/{userId}/resume-work | needs_review | needs_review | InspectionTeamManagement | no | 200 |
| GET | /api/inspection/team-management/metadata | existing_allowlist | read_candidate | InspectionTeamManagement | no | 200 |
| GET | /api/inspection/team-management/summary | existing_allowlist | read_candidate | InspectionTeamManagement | no | 200 |
| POST | /api/inspection/team-management/tasks/export | prohibited_candidate | prohibited_candidate | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/tasks/query | existing_allowlist | read_candidate | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/tasks/reassign | prohibited_candidate | prohibited_candidate | InspectionTeamManagement | yes | 200 |
| POST | /api/inspection/team-management/urgent-task-alerts/run | needs_review | needs_review | InspectionTeamManagement | no | 200 |
| POST | /api/InspectionReports/ExpiredLicenses/Export | prohibited_candidate | prohibited_candidate | InspectionReports | yes | 200 |
| POST | /api/InspectionReports/Tasks/Export | prohibited_candidate | prohibited_candidate | InspectionReports | yes | 200 |
| POST | /api/InspectionReports/Violations/Export | prohibited_candidate | prohibited_candidate | InspectionReports | yes | 200 |
| POST | /api/internal/approval-recall/payment-reservations | needs_review | needs_review | CustomerInternal | yes | 200, 401, 409 |
| POST | /api/internal/approval-recall/payment-writeback/validate | read_candidate | read_candidate | CustomerInternal | yes | 200, 401 |
| POST | /api/internal/content-ai/audit-writeback | needs_review | needs_review | CustomerInternal | yes | 200, 400, 401 |
| POST | /api/internal/content-team-read/resync | needs_review | needs_review | CustomerInternal | yes | 200, 401 |
| POST | /api/internal/content/auto-approve | prohibited_candidate | prohibited_candidate | CustomerInternal | yes | 200, 401 |
| POST | /api/internal/customer-portal/content-library/book-approval-status | needs_review | needs_review | CustomerPortalInternal | yes | 200 |
| POST | /api/internal/customer-portal/enquiries/{id}/sync | needs_review | needs_review | CustomerPortalInternal | no | 200 |
| POST | /api/internal/customer-portal/users/{id}/sync | needs_review | needs_review | CustomerPortalInternal | no | 200 |
| POST | /api/internal/disposition-submissions | needs_review | needs_review | CustomerInternal | yes | 200, 400, 401 |
| POST | /api/internal/fahr/decision-callback | needs_review | needs_review | CustomerInternal | yes | 200, 401 |
| POST | /api/internal/fahr/outbound-writeback | needs_review | needs_review | CustomerInternal | yes | 200, 400, 401 |
| POST | /api/internal/inspection/tasks/signature/contact-persons | needs_review | needs_review | CustomerInternal | yes | 200, 400, 401 |
| GET | /api/internal/inspection/tasks/signature/context | read_candidate | read_candidate | CustomerInternal | no | 200, 400, 401 |
| POST | /api/internal/inspection/violations | needs_review | needs_review | CustomerInternal | yes | 201, 400, 401 |
| POST | /api/internal/inspection/violations/payment-succeeded | needs_review | needs_review | CustomerInternal | yes | 204 |
| POST | /api/internal/jobs/ai-approval | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/approval-recall-reconciliation | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/auto-assignment | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/auto-assignment/{instanceId} | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/business-notification-dispatches/{dispatchId}/replay | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/business-notification-reconciliation | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/change-certificate-status | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/content-team-task-read-rebuild | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/d365-case-sync | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/declaration-link-notifications | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/declaration-link-notifications/{violationId}/retry | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/expire-disposition-cases | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/fahr-permit-pdf | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/fine-export-daily | prohibited_candidate | prohibited_candidate | InternalJobs | no | 200 |
| POST | /api/internal/jobs/inspection-appeal-auto-reject | prohibited_candidate | prohibited_candidate | InternalJobs | no | 200 |
| POST | /api/internal/jobs/inspection-daily-auto-task | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/licensing-team-task-read-rebuild | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/magnati-mis-daily-reconciliation | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/profile-review-assignment | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/reminders/day | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/reminders/hours | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/reminders/minutes | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/self-monitor-trial-review-notifications | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/jobs/sla-warnings | needs_review | needs_review | InternalJobs | no | 200 |
| POST | /api/internal/licensing/auto-approve | prohibited_candidate | prohibited_candidate | CustomerInternal | yes | 200, 401 |
| POST | /api/internal/workflow/pending-modification/auto-cancel | prohibited_candidate | prohibited_candidate | CustomerInternal | yes | 200, 401 |
| POST | /api/internal/workflow/resume-after-modification | needs_review | needs_review | CustomerInternal | yes | 200 |
| POST | /api/internal/workflow/start | prohibited_candidate | prohibited_candidate | CustomerInternal | yes | 200, 401 |
| GET | /api/Job/{legacyPath} | read_candidate | read_candidate | Job | no | 410 |
| POST | /api/Job/{legacyPath} | needs_review | needs_review | Job | no | 410 |
| GET | /api/license/dashboard/license-distribution | existing_allowlist | read_candidate | LicenseDashboard | no | 200, 400 |
| GET | /api/license/dashboard/members-needing-coaching | existing_allowlist | read_candidate | LicenseDashboard | no | 200, 400, 403 |
| GET | /api/license/dashboard/members-on-leave | existing_allowlist | read_candidate | LicenseDashboard | no | 200 |
| GET | /api/license/dashboard/needs-attention | existing_allowlist | read_candidate | LicenseDashboard | no | 200, 400 |
| GET | /api/license/dashboard/overview | existing_allowlist | read_candidate | LicenseDashboard | no | 200, 400, 401 |
| GET | /api/license/dashboard/performance | existing_allowlist | read_candidate | LicenseDashboard | no | 200, 400 |
| GET | /api/license/dashboard/performance-trend | existing_allowlist | read_candidate | LicenseDashboard | no | 200, 400 |
| GET | /api/LicenseManagement/{id} | read_candidate | read_candidate | LicenseManagement | no | 200 |
| GET | /api/LicenseManagement/content/permit/analytics | read_candidate | read_candidate | LicenseManagement | no | 200 |
| GET | /api/LicenseManagement/content/permit/list | read_candidate | read_candidate | LicenseManagement | no | 200 |
| GET | /api/LicenseManagement/content/permit/list/export | prohibited_candidate | prohibited_candidate | LicenseManagement | no | 200 |
| GET | /api/LicenseManagement/dashboard/report | existing_allowlist | read_candidate | LicenseManagement | no | 200 |
| GET | /api/LicenseManagement/dashboard/report/export | prohibited_candidate | prohibited_candidate | LicenseManagement | no | 200 |
| GET | /api/LicenseManagement/dashboard/statistics | existing_allowlist | read_candidate | LicenseManagement | no | 200 |
| POST | /api/LicenseManagement/ExportLicensePermits | prohibited_candidate | prohibited_candidate | LicenseManagement | yes | 200 |
| POST | /api/LicenseManagement/list | existing_allowlist | read_candidate | LicenseManagement | yes | 200 |
| GET | /api/LicenseManagement/statistics | existing_allowlist | read_candidate | LicenseManagement | no | 200 |
| POST | /api/LicenseManagement/UpdateCertificateStatus | prohibited_candidate | prohibited_candidate | LicenseManagement | yes | 200 |
| GET | /api/licensing/team-management/members | existing_allowlist | read_candidate | LicensingTeamManagement | no | 200 |
| GET | /api/licensing/team-management/members-optimized | read_candidate | read_candidate | LicensingTeamManagement | no | 200 |
| POST | /api/licensing/team-management/members/{userId}/emergency-leave | needs_review | needs_review | LicensingTeamManagement | yes | 200 |
| POST | /api/licensing/team-management/members/{userId}/resume-work | needs_review | needs_review | LicensingTeamManagement | no | 200 |
| GET | /api/licensing/team-management/members/reassignment | read_candidate | read_candidate | LicensingTeamManagement | no | 200 |
| POST | /api/licensing/team-management/members/reassignment/query | read_candidate | read_candidate | LicensingTeamManagement | yes | 200 |
| GET | /api/licensing/team-management/metadata | existing_allowlist | read_candidate | LicensingTeamManagement | no | 200 |
| GET | /api/licensing/team-management/statuses | read_candidate | read_candidate | LicensingTeamManagement | no | 200 |
| GET | /api/licensing/team-management/summary | existing_allowlist | read_candidate | LicensingTeamManagement | no | 200 |
| GET | /api/licensing/team-management/summary-v2 | read_candidate | read_candidate | LicensingTeamManagement | no | 200 |
| POST | /api/licensing/team-management/tasks/export | prohibited_candidate | prohibited_candidate | LicensingTeamManagement | yes | 200 |
| POST | /api/licensing/team-management/tasks/export-v2 | prohibited_candidate | prohibited_candidate | LicensingTeamManagement | yes | 200 |
| POST | /api/licensing/team-management/tasks/query | existing_allowlist | read_candidate | LicensingTeamManagement | yes | 200 |
| POST | /api/licensing/team-management/tasks/query-v2 | read_candidate | read_candidate | LicensingTeamManagement | yes | 200 |
| POST | /api/licensing/team-management/tasks/reassign | prohibited_candidate | prohibited_candidate | LicensingTeamManagement | yes | 200 |
| POST | /api/licensing/team-management/tasks/reassign-v2 | prohibited_candidate | prohibited_candidate | LicensingTeamManagement | yes | 200 |
| POST | /api/licensing/team-management/urgent-task-alerts/run | needs_review | needs_review | LicensingTeamManagement | no | 200 |
| GET | /api/Log/SecurityAuditLog/{id} | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/SecurityAuditLogExport | prohibited_candidate | prohibited_candidate | Log | yes | 200 |
| GET | /api/Log/SecurityAuditLogFilterOptions | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/SecurityAuditLogPage | read_candidate | read_candidate | Log | yes | 200 |
| GET | /api/Log/SecurityLog/{id} | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/SecurityLogExport | prohibited_candidate | prohibited_candidate | Log | yes | 200 |
| GET | /api/Log/SecurityLogFilterOptions | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/SecurityLogPage | read_candidate | read_candidate | Log | yes | 200 |
| GET | /api/Log/SystemOperationLog/{id} | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/SystemOperationLogExport | prohibited_candidate | prohibited_candidate | Log | yes | 200 |
| GET | /api/Log/SystemOperationLogFilterOptions | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/SystemOperationLogPage | read_candidate | read_candidate | Log | yes | 200 |
| GET | /api/Log/UserActivityLog/{id} | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/UserActivityLogExport | prohibited_candidate | prohibited_candidate | Log | yes | 200 |
| GET | /api/Log/UserActivityLogFilterOptions | read_candidate | read_candidate | Log | no | 200 |
| POST | /api/Log/UserActivityLogPage | read_candidate | read_candidate | Log | yes | 200 |
| POST | /api/LogSeach/CreateAuditLog | prohibited_candidate | prohibited_candidate | AuditLog | yes | 200 |
| GET | /api/LogSeach/GetAuditLogPageList | read_candidate | read_candidate | AuditLog | no | 200 |
| GET | /api/LogSeach/greeting | read_candidate | read_candidate | AuditLog | no | 200 |
| GET | /api/Lookup/GetAgeClassifications | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetArtistWorkTypes | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetAuthoritiesByEmirateId | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetCourierList | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetEconomicActivityByServiceCode/{serviceCode} | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetFieldDictionaryList | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetLookupData | existing_allowlist | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetLookupTables | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetMediaMaterialCategoryTree | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetPortsList | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetServiceLookupMappingByServiceCode | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetServiceProcessByServiceCode | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetSocialMediaSubCategory/{mediaCategoryId} | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetSubjectList | existing_allowlist | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/GetSubjectSubList | read_candidate | read_candidate | Lookup | no | 200 |
| GET | /api/Lookup/MaterialTypes | read_candidate | read_candidate | Lookup | no | 200 |
| POST | /api/magnati-mis-ftp-test/fine-export-roundtrip | prohibited_candidate | prohibited_candidate | MagnatiMisFtpTest | no | 200 |
| POST | /api/magnati-mis-ftp-test/roundtrip | needs_review | needs_review | MagnatiMisFtpTest | no | 200 |
| POST | /api/magnati-mis-ftp-test/upload | prohibited_candidate | prohibited_candidate | MagnatiMisFtpTest | yes | 200 |
| POST | /api/magnati-mis-ftp-test/upload-from-storage | prohibited_candidate | prohibited_candidate | MagnatiMisFtpTest | yes | 200 |
| POST | /api/MediaContentReports/BookCirculationPrintingPermit/Export | prohibited_candidate | prohibited_candidate | MediaContentReports | yes | 200 |
| GET | /api/MediaContentReports/BookCirculationPrintingPermit/ServiceOptions | read_candidate | read_candidate | MediaContentReports | no | 200 |
| POST | /api/MediaContentReports/CirculationMediaMaterialPermit/Export | prohibited_candidate | prohibited_candidate | MediaContentReports | yes | 200 |
| POST | /api/MediaContentReports/NewspapersMagazinesCirculation/Export | prohibited_candidate | prohibited_candidate | MediaContentReports | yes | 200 |
| POST | /api/MediaContentReports/RecordedBooks/Export | prohibited_candidate | prohibited_candidate | MediaContentReports | yes | 200 |
| POST | /api/MediaContentReports/RegulateEntriesApplications/Export | prohibited_candidate | prohibited_candidate | MediaContentReports | yes | 200 |
| POST | /api/MediaLicenseReports/CancelledActivities/Export | prohibited_candidate | prohibited_candidate | MediaLicenseReports | yes | 200 |
| POST | /api/MediaLicenseReports/ElectronicMedia/Export | prohibited_candidate | prohibited_candidate | MediaLicenseReports | yes | 200 |
| POST | /api/MediaLicenseReports/LicenseData/Export | prohibited_candidate | prohibited_candidate | MediaLicenseReports | yes | 200 |
| GET | /api/MessageLog/GetById | read_candidate | read_candidate | MessageLog | no | 200 |
| POST | /api/MessageLog/GetList | read_candidate | read_candidate | MessageLog | yes | 200 |
| GET | /api/Payments/dashboard/emirates/list | read_candidate | read_candidate | Payments | no | 200 |
| GET | /api/Payments/dashboard/emirates/list/export | prohibited_candidate | prohibited_candidate | Payments | no | 200 |
| GET | /api/Payments/dashboard/statistics | read_candidate | read_candidate | Payments | no | 200 |
| GET | /api/Payments/dashboard/usertype/list | read_candidate | read_candidate | Payments | no | 200 |
| GET | /api/Payments/dashboard/usertype/list/export | prohibited_candidate | prohibited_candidate | Payments | no | 200 |
| GET | /api/pdf/preview | read_candidate | read_candidate | PdfView | no | 200 |
| POST | /api/pdf/preview | read_candidate | read_candidate | PdfView | no | 200 |
| GET | /api/Refund/Admin/ApplicationSummary/{applicationId} | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Departments | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Tickets | existing_allowlist | prohibited_candidate | Refund | no | 200 |
| POST | /api/Refund/Admin/Tickets/{refundId}/Conversation | prohibited_candidate | prohibited_candidate | Refund | yes | 200 |
| GET | /api/Refund/Admin/Tickets/{refundId}/Detail | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| POST | /api/Refund/Admin/Tickets/{refundId}/Status | prohibited_candidate | prohibited_candidate | Refund | yes | 200 |
| POST | /api/Refund/Admin/Tickets/{refundId}/Status/SendBack | prohibited_candidate | prohibited_candidate | Refund | yes | 200 |
| POST | /api/Refund/Admin/Tickets/{refundId}/Status/Transfer | prohibited_candidate | prohibited_candidate | Refund | yes | 200 |
| GET | /api/Refund/Admin/Tickets/{refundId}/Timeline | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Tickets/CustomerService | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Tickets/CustomerService/Export | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Tickets/Export | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Tickets/Statistics | existing_allowlist | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Types/Categories | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Types/Decision | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Types/Department/Status | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Types/SourceType | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/Types/Status | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Admin/User/Departments | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Management/Refunds | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Management/StatusCount | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| GET | /api/Refund/Types/DepartmentDecision | prohibited_candidate | prohibited_candidate | Refund | no | 200 |
| POST | /api/Role/AddRole | prohibited_candidate | prohibited_candidate | Role | yes | 200 |
| POST | /api/Role/DeleteRole | prohibited_candidate | prohibited_candidate | Role | yes | 200 |
| GET | /api/Role/GetRoleByDiscriminator/{Discriminator} | read_candidate | read_candidate | Role | no | 200 |
| GET | /api/Role/GetRoleById | read_candidate | read_candidate | Role | no | 200 |
| GET | /api/Role/GetRoleDeptartment | read_candidate | read_candidate | Role | no | 200 |
| POST | /api/Role/GetRoleList | read_candidate | read_candidate | Role | yes | 200 |
| POST | /api/Role/GetRoleListByDepartmentId | read_candidate | read_candidate | Role | yes | 200 |
| POST | /api/Role/GetRolesGroupedByDepartmentId | read_candidate | read_candidate | Role | yes | 200 |
| POST | /api/Role/GiveUserRole | needs_review | needs_review | Role | yes | 200 |
| PUT | /api/Role/UpdateRole | prohibited_candidate | prohibited_candidate | Role | yes | 200 |
| GET | /api/ServiceCategories | read_candidate | read_candidate | ServiceCategories | no | 200 |
| POST | /api/ServiceCategories | needs_review | needs_review | ServiceCategories | yes | 200 |
| DELETE | /api/ServiceCategories/{id} | prohibited_candidate | prohibited_candidate | ServiceCategories | no | 200 |
| GET | /api/ServiceCategories/{id} | read_candidate | read_candidate | ServiceCategories | no | 200 |
| PUT | /api/ServiceCategories/{id} | prohibited_candidate | prohibited_candidate | ServiceCategories | yes | 200 |
| GET | /api/ServiceCategories/CheckNameExists | read_candidate | read_candidate | ServiceCategories | no | 200 |
| GET | /api/ServiceCategories/PageList | read_candidate | read_candidate | ServiceCategories | no | 200 |
| PUT | /api/ServiceCategories/UpdateSort | prohibited_candidate | prohibited_candidate | ServiceCategories | yes | 200 |
| POST | /api/ServiceCertificate | needs_review | needs_review | ServiceCertificate | yes | 200 |
| GET | /api/ServiceCertificate/{id} | read_candidate | read_candidate | ServiceCertificate | no | 200 |
| GET | /api/ServiceCertificate/GetServiceCertificateTemplate | read_candidate | read_candidate | ServiceCertificate | no | 200 |
| PUT | /api/ServiceCertificate/UpdateSerivceCertificate/{id} | prohibited_candidate | prohibited_candidate | ServiceCertificate | yes | 200 |
| POST | /api/ServiceInfo/AddFormStep | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/AddService | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| GET | /api/ServiceInfo/dashboard/customer/list | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/dashboard/customer/list/export | prohibited_candidate | prohibited_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/dashboard/customer/statistics | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/dashboard/service/list | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/dashboard/service/list/export | prohibited_candidate | prohibited_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/dashboard/service/statistics | read_candidate | read_candidate | ServiceInfo | no | 200 |
| DELETE | /api/ServiceInfo/DeleteFormStep/{id} | prohibited_candidate | prohibited_candidate | ServiceInfo | no | 200 |
| DELETE | /api/ServiceInfo/DeleteService | prohibited_candidate | prohibited_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetAllServicesNewAsyncTEST | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetAllUserType | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetEconomicActivitys | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetFormStepList/{serviceId} | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetMainHaveChildren | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetPrePublishTestAccount | prohibited_candidate | prohibited_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetPublicService | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceByCode/{serviceCode} | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceById/{Id} | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceCanPublish | prohibited_candidate | prohibited_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceCurrentVersion/{serviceCode} | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceForms/{serviceId} | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceHistoryBackUps/{serviceCode} | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceIndextCount | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceInfoFeatured | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServiceOnlyParent | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServicesToPage | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetServicesToPageByCategory | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/GetTypeDictionaryList | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/IsExistingCodes | read_candidate | read_candidate | ServiceInfo | no | 200 |
| GET | /api/ServiceInfo/Restore/{serviceId} | prohibited_candidate | prohibited_candidate | ServiceInfo | no | 200 |
| POST | /api/ServiceInfo/SaveSort | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/ServicePublishForm | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/ServiceSaveForm | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/UpdaeServiceForm | needs_review | needs_review | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/UpdateFeatured | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/UpdateFormStep | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/UpdateService | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceInfo/UpdateStatus | prohibited_candidate | prohibited_candidate | ServiceInfo | yes | 200 |
| POST | /api/ServiceWorkflowConfigurationController/AddWorkflowConfiguration | prohibited_candidate | prohibited_candidate | ServiceWorkflowConfiguration | yes | 200 |
| GET | /api/ServiceWorkflowConfigurationController/GetWorkflowConfigurationByServiceId/{serviceId} | read_candidate | read_candidate | ServiceWorkflowConfiguration | no | 200 |
| GET | /api/ServiceWorkflowConfigurationController/GetWorkflowConfigurationByServiceIdAndVersion/{serviceId}/{version} | read_candidate | read_candidate | ServiceWorkflowConfiguration | no | 200 |
| GET | /api/ServiceWorkflowConfigurationController/GetWorkflowConfigurationVersionsByServiceId/{serviceId} | read_candidate | read_candidate | ServiceWorkflowConfiguration | no | 200 |
| POST | /api/ServiceWorkflowConfigurationController/UpdateWorkflowConfiguration | prohibited_candidate | prohibited_candidate | ServiceWorkflowConfiguration | yes | 200 |
| GET | /api/Team/{departmentId}/TeamUserLogs | read_candidate | read_candidate | Team | no | 200 |
| POST | /api/Team/MyTeamMemberLeave | needs_review | needs_review | Team | yes | 200 |
| GET | /api/Team/MyTeamMemberReturn | read_candidate | read_candidate | Team | no | 200 |
| GET | /api/Team/MyTeamMembers | read_candidate | read_candidate | Team | no | 200 |
| POST | /api/TypeDictionary/CreateTypeDictionary | prohibited_candidate | prohibited_candidate | TypeDictionary | yes | 200 |
| DELETE | /api/TypeDictionary/DeleteTypeDictionary/{id} | prohibited_candidate | prohibited_candidate | TypeDictionary | no | 200 |
| GET | /api/TypeDictionary/GetTypeDictionaries/{scope} | read_candidate | read_candidate | TypeDictionary | no | 200 |
| GET | /api/TypeDictionary/GetTypeDictionaryById/{id} | read_candidate | read_candidate | TypeDictionary | no | 200 |
| PUT | /api/TypeDictionary/UpdateTypeDictionary/{id} | prohibited_candidate | prohibited_candidate | TypeDictionary | yes | 200 |
| GET | /api/UserManagement/{userProfileId}/ProfileAndApplicant | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/{userProfileId}/Relate | read_candidate | read_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/AddAdminUserAsync | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| GET | /api/UserManagement/AdminUserActive | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/CheckAdminPassWord | read_candidate | read_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/CustomerUser/Impersonate | needs_review | needs_review | UserManagement | yes | 200 |
| POST | /api/UserManagement/CustomerUser/SendEmail | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| POST | /api/UserManagement/CustomerUser/SendExternalSMS | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| POST | /api/UserManagement/CustomerUser/SendSMS | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| GET | /api/UserManagement/dashboard/list | existing_allowlist | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/dashboard/list/export | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/dashboard/profile/statistics | existing_allowlist | read_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/DeleteAdminUserAsync | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| GET | /api/UserManagement/ExportCustomerUsersAsync | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/ExportProfileListAsync | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetAccountOrIndividualOrEstablishment | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetAdminUserAsync | existing_allowlist | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetAdminUserListAsync | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetAreaList/{id} | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetCustomerInfoCountDto | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetCustomerUsersAsync | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetEmirateList | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetEstablishmentByProfileId/{profileId} | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetNationalityList | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetProfileCount | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetProfileList | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetRegionList/{id} | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetSysPermissionList | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetUserRolesAndPermission | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/GetUserRolesAndPermissions | read_candidate | read_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/ResendAdminDefaultPassword/{targetUserId} | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/SetAdminUserLeaderAsync | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| POST | /api/UserManagement/SysPermissionAdd | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| DELETE | /api/UserManagement/SysPermissionDelete | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/SysPermissionUpdate | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| POST | /api/UserManagement/UpdateAdminPassWord | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| POST | /api/UserManagement/UpdateAdminUserAsync | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| POST | /api/UserManagement/UpdateAdminUserCenterAsync | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| GET | /api/UserManagement/UpdateCustomerUserActiveAsync | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UpdateProfileActiveAsync | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UpdateProfileIsVIPAsync | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/UserProfile/{id}/Assign/Auto | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| POST | /api/UserManagement/UserProfile/{id}/Assign/Manual | prohibited_candidate | prohibited_candidate | UserManagement | yes | 200 |
| GET | /api/UserManagement/UserProfile/{id}/AssignableReviewers | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/{id}/Establishment | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/{id}/Personal | read_candidate | read_candidate | UserManagement | no | 200 |
| POST | /api/UserManagement/UserProfile/{Id}/Process | needs_review | needs_review | UserManagement | yes | 200 |
| GET | /api/UserManagement/UserProfile/{Id}/Reject/Notes | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/{profileId}/Partners | read_candidate | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/Approves | existing_allowlist | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/Approves/Export | prohibited_candidate | prohibited_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/Status | existing_allowlist | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/Type/Count | existing_allowlist | read_candidate | UserManagement | no | 200 |
| GET | /api/UserManagement/UserProfile/UserTypes | existing_allowlist | read_candidate | UserManagement | no | 200 |
| POST | /api/Webhook/syncallusers | needs_review | needs_review | Webhook | no | 200, 401 |
| POST | /api/Webhook/syncenquiry | needs_review | needs_review | Webhook | no | 410 |
| POST | /api/Webhook/syncenquiry/{id} | needs_review | needs_review | Webhook | no | 410 |
| POST | /api/Webhook/syncuser/{id} | needs_review | needs_review | Webhook | no | 410 |
| POST | /api/Webhook/updateenquiry/{id} | needs_review | needs_review | Webhook | no | 410 |
| GET | /api/WorkflowAction/Catalog | read_candidate | read_candidate | WorkflowAction | no | 200 |
| GET | /api/WorkflowAction/TaskActions/{taskId} | read_candidate | read_candidate | WorkflowAction | no | 200 |
