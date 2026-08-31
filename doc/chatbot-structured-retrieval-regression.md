# Chatbot Structured Retrieval Regression

Use this suite after changing a Skill workflow, the router, Tool Registry, or response safety. Run each multi-turn case in one new conversation unless the case says otherwise. Verify user-visible output and the matching `skill.route` / `tool.call` audit events.

Do not assert a fixed record count. The UMC account data changes; compare each answer with the matching portal filter and current account records.

## Licenses and Permits

| ID | Conversation | Expected user-visible result | Expected audit behavior | Coverage |
| --- | --- | --- | --- | --- |
| LP-01 | `Do I have expired license?` | Lists only the current account's expired issued records. The total and displayed records match the Licenses & Permits page filtered to `Expired`. | `skillId=license_permit_status`, `intentId=expired`; `umc.licenses.list` receives `statuses=["EXPIRED"]`. | Browser + audit verified 2026-08-31. |
| LP-02 | After LP-01: `show me the first detail` | Describes the first record from LP-01 in natural language. It must not show JSON, tool names, request arguments, URLs, passwords, or API envelopes. | Routes in the active license domain with `intentId=detail`. When the selection is resolved, the audit must identify the selected record's read-only lookup or source-list evidence. | Browser verified 2026-08-31. |
| LP-03 | After LP-02: `download this license` | Directs the customer to `/permits-license` and the selected record's `Download` action. It must not download a file, expose a URL/access code/password, or claim that a download started. | `permit_download` is portal-only: no document-download tool call. | Browser verified 2026-08-31. |
| LP-04 | `How many licenses are about to expire?` | Counts only records in the portal's `Expiring Soon` scope. Already expired records must not be included. The count matches the portal filtered to `Expiring Soon`. | `skillId=license_permit_status`, `intentId=expiring_soon`; `umc.licenses.list` receives `statuses=["EXPIRE_SOON","205"]`. | Browser + workflow/audit configuration verified 2026-08-31. |
| LP-05 | After a license list with at least two records: `show me the second detail` | Describes the second record from the immediately preceding list and does not switch to general knowledge. | Selection uses the active Skill's `record` filter with ordinal 2 and only reads the selected record. | Unit coverage; keep as a manual browser regression when an account has two matching records. |
| LP-06 | `How about my Social Media Advertiser Permit?` | Looks up the current account's issued permits. If the named permit is absent, states that no matching issued record was found; it must not claim that account data is inaccessible or direct the user to Public Verify. | `skillId=license_permit_status`, `intentId=named_permit`; first tool is `umc.licenses.list`. No `knowledge.search` or public-verification tool is called. | Browser + audit verified 2026-09-01. |

## Renewal Status

| ID | Conversation | Expected user-visible result | Expected audit behavior | Coverage |
| --- | --- | --- | --- | --- |
| LR-01 | After selecting an issued permit: `How do I renew the second permit?` | Separates the issued permit's status from its renewal application's status. An application is a renewal only when UMC returns `Request Type = Renew` or an official renewal service name. A completed `Modify` or `New` application must never be presented as a renewal. | `skillId=license_renewal`, `intentId=personal_renewal_status`; `umc.applications` is the first account lookup. `umc.application_detail` is used only after an application is selected. | Workflow configuration verified 2026-09-01; run as a live browser regression with a current UMC token. |
| LR-02 | `What documents do I need to renew a Social Media Advertiser Permit?` | Gives general renewal guidance from the knowledge base only. It does not claim a personal permit or renewal status. | `skillId=license_renewal`, `intentId=general_guidance`; calls `knowledge.search` only. | Workflow routing verified 2026-08-31. |

## License and Permit Modification

| ID | Conversation | Expected user-visible result | Expected audit behavior | Coverage |
| --- | --- | --- | --- | --- |
| LPM-01 | `What documents do I need to modify a Media License?` | Gives evidence-based general modification documents, rules, fees, and process. It does not claim that a modification was created or submitted. | `skillId=license_permit_modification_knowledge`; calls `knowledge.search` only. | Browser + audit verified 2026-09-01. |
| LPM-02 | `Can I modify my Media License?` | Reads the current issued records and states Modify availability only from each returned record's actions. It never starts a modification. | `skillId=license_permit_modification_knowledge`; calls `umc.licenses.list`, not `knowledge.search`. | Browser + audit verified 2026-09-01. |

## License Application Knowledge

| ID | Conversation | Expected user-visible result | Expected audit behavior | Coverage |
| --- | --- | --- | --- | --- |
| LAK-01 | `How do I apply for a Social Media Advertiser Permit?` | Gives knowledge-base guidance for the named permit's requirements and process. It may ask a follow-up only after answering when a personal condition affects applicability. It must not begin by classifying the user into an unrelated public-service category. | `skillId=license_application_knowledge`; calls `knowledge.search`. It must not route to `service_discovery` solely because the question contains `social media` or `advertiser permit`. | Browser + audit verified 2026-09-01. |

## My Requests

| ID | Conversation | Expected user-visible result | Expected audit behavior | Coverage |
| --- | --- | --- | --- | --- |
| MR-01 | `Show my requests submitted from 2026-08-01 to 2026-08-31 with status Under Review.` | Lists only the current account's `Under Review` applications in the inclusive date range. Each shown submission date and status matches the My Requests page. | `skillId=application_status`, `intentId=list`; `umc.applications` receives `applicationStatusId="102"`, `startTime="2026-08-01"`, and `endTime="2026-08-31"`. | Browser + audit verified 2026-08-31. |
| MR-02 | After MR-01 with at least two records: `show me the second detail` | Describes the second application from the preceding result; no internal JSON or tool arguments are shown. | Uses `application_status` selection (`record.ordinal=2`) and the configured read-only detail path. | Unit coverage; keep as a manual browser regression when the result has at least two records. |
| MR-03 | `What pending actions do I have?` | Lists only the Pending Actions summary for the current account. It does not describe the Application table total or present it as history. | `skillId=my_requests_pending_actions`; the first tool is `umc.pending-actions`. `umc.applications` may be used only to enrich a pending record. | Browser + audit verified against `localhost:18085` on 2026-09-01: 23 total actions, split 2 Pending Payment, 6 Pending Modification, and 15 Draft. |
| MR-04 | `Which applications are pending payment?` then `show payment details for the first one` | The first turn lists only Pending Payment applications. The second reports only returned amount, currency, payment status, due date, and timeline; it does not start payment. It preserves the selected list's Application No. and never relabels an internal numeric ID as that number. | `skillId=application_payment_details`; first tool is `umc.applications` with `applicationStatusId="103"`. The detail call binds its `applicationId` argument to the selected prior-list item's `id`. The published Tool Registry record masks `applicationId` and `serviceApplicationId` before evidence reaches the model. | Browser + audit verified against `localhost:18085` on 2026-09-01: two Pending Payment applications; detail used `umc.application_payment_detail` and returned its fee breakdown and due date. |
| MR-05 | `Check ML-2-...` | Treats the value as an application number keyword, never as an internal `applicationId`. A unique match may then be selected for detail. | `skillId=application_status`; the list request binds it to `keyword`. No direct numeric detail request is made from the string. | Routing unit coverage; live verification requires an authenticated portal session. |
| MR-06 | `What is the status of my renewal application ML-2-...?` | Uses My Requests and calls it a renewal only when the returned Request Type is `Renew`. A completed `Modify` or `New` application is not presented as a renewal. | `skillId=application_status`; response preserves `Request Type` separately from status. | Routing/workflow unit coverage; live verification requires an authenticated portal session. |
| MR-07 | `Show my newest requests` | Lists newest first, matching the portal's default Submission Time order. | `umc.applications` uses `sortBy="createdOn"` and `sortDirection=0` (descending); ascending uses `sortDirection=1`. | Local-portal source and rendered-table verified 2026-09-01. |
| MR-08 | After listing a `Modify` or `Cancel` application: `show its detail` | Preserves the public Application No., Request Type, status, times, and only the type-specific detail fields returned by UMC. A `Modify` detail may contain change/activity information; a `Cancel` detail may contain cancellation information. | Both selections use the same read-only `umc.application_detail` tool, bound to the preceding list item's `id`; Request Type must not select a different endpoint. | Browser Network verified against `localhost:18085` on 2026-09-01: Modify and Cancel both called `GET /api/MyRequest/ApplicationDetail/{id}` with HTTP 200. Unit coverage verifies both selection bindings. |

## Payments

Before running these cases, create and publish the three read-only Tools in the Tools console, then bind them to `payment_transaction_history` in the Skills console. The backend does not seed these business Tool definitions:

- `umc.payment_statistics`: `GET /api/payment-center/transactions/statistics`
- `umc.payment_transaction_types`: `GET /api/Wallet/Transaction/Type`
- `umc.payment_transaction_statuses`: `GET /api/Wallet/Transaction/Status`

| ID | Conversation | Expected user-visible result | Expected audit behavior | Coverage |
| --- | --- | --- | --- | --- |
| PAY-01 | `我一共支付了多少？` | Reports only the five summary values returned by Payments statistics, with returned currency/sign context. It does not call Total Spending a balance or calculate a total. | `skillId=payment_transaction_history`; only `umc.payment_statistics` is called. | Console configuration + live regression. |
| PAY-02 | `Find transaction number XXX` | Returns only the exact matching transaction, or states that no matching transaction appears in the returned page. It states the page, total, and active filters. | `umc.payments` receives `keyWord="XXX"`, `pageIndex=1`, `pageSize=10`, `sortBy="createdOn"`, and `sortDirection=1`. | Console configuration + live regression; Portal request mapping verified 2026-09-01. |
| PAY-03 | `Which refunds are in progress?` | Lists only records matching the returned Refund type and Refund in Progress status; it does not imply the customer may request a refund. | `umc.payments` receives `transactionTypeId=4` and `statusId=6` with the default page/sort fields. | Console configuration + live regression; IDs verified from Portal transaction filters. |
| PAY-04 | `Where is the receipt for transaction XXX?` | Checks the transaction history only. For a Completed transaction, says that the Portal displays `Download Receipt`; it never emits a URL or downloads a file. | `skillId=payment_transaction_history`; read-only transaction query only. | Manual Portal regression after each response-template change. |
| PAY-05 | `Download receipt`, `I want a refund`, or `Export my transactions` | Explains the corresponding visible Portal action. It does not create a refund, download a receipt, export data, or start payment. | `skillId=payment_transaction_history`, `mode=portal_action`; no `tool.call`. | Routing unit coverage. |
| PAY-06 | `申请 ML-2-... 待付款` | Uses the selected My Requests application's read-only payment detail, not the transaction history. | `skillId=application_payment_details`. | Routing unit coverage. |
| PAY-07 | `待缴罚款有哪些？` | Lists current unpaid fines and describes the Portal flow only. | `skillId=fine_payment_guidance`; `umc.pending-violations` only. | Console configuration + live regression. |

## Cross-Domain Safety

| ID | Conversation | Expected result | Coverage |
| --- | --- | --- | --- |
| CD-01 | Any successful data-query response that uses a tool | The final assistant response contains only customer-facing business information. It never contains a tool invocation such as `{"tool": ..., "args": ...}`, an API envelope, hidden URL, or credential. | Browser verified for LP-02; unit coverage verifies protocol detection. |
| CD-02 | A follow-up such as `show me the first detail` after a business list | Keeps the active business domain and does not fall back to the general knowledge base merely because the follow-up has no domain keyword. | Unit coverage; LP-02 is the live browser check. |
| CD-03 | A UMC-backed tool returns `401` | Operators can correlate the WebSocket-authenticated token, the dispatched tool call, and the Customer Portal response without exposing a raw token. | `backend` and `platform-gateway` logs share `request_id` and a SHA-256 token-hash prefix across `umc_ws_authenticated`, `umc_tool_*`, and `customer_*` records. | Controlled gateway check verified 2026-09-01. |

## Not Yet Included

Complaints and Refund have not yet been given structured retrieval workflows with verified server-side filters. Add cases only after their Skills declare the applicable intents, filters, and Tool Registry parameter bindings.
