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

## My Requests

| ID | Conversation | Expected user-visible result | Expected audit behavior | Coverage |
| --- | --- | --- | --- | --- |
| MR-01 | `Show my requests submitted from 2026-08-01 to 2026-08-31 with status Under Review.` | Lists only the current account's `Under Review` applications in the inclusive date range. Each shown submission date and status matches the My Requests page. | `skillId=application_status`, `intentId=list`; `umc.applications` receives `applicationStatusId="102"`, `startTime="2026-08-01"`, and `endTime="2026-08-31"`. | Browser + audit verified 2026-08-31. |
| MR-02 | After MR-01 with at least two records: `show me the second detail` | Describes the second application from the preceding result; no internal JSON or tool arguments are shown. | Uses `application_status` selection (`record.ordinal=2`) and the configured read-only detail path. | Unit coverage; keep as a manual browser regression when the result has at least two records. |

## Cross-Domain Safety

| ID | Conversation | Expected result | Coverage |
| --- | --- | --- | --- |
| CD-01 | Any successful data-query response that uses a tool | The final assistant response contains only customer-facing business information. It never contains a tool invocation such as `{"tool": ..., "args": ...}`, an API envelope, hidden URL, or credential. | Browser verified for LP-02; unit coverage verifies protocol detection. |
| CD-02 | A follow-up such as `show me the first detail` after a business list | Keeps the active business domain and does not fall back to the general knowledge base merely because the follow-up has no domain keyword. | Unit coverage; LP-02 is the live browser check. |

## Not Yet Included

Complaints and Refund have not yet been given structured retrieval workflows with verified server-side filters. Add cases only after their Skills declare the applicable intents, filters, and Tool Registry parameter bindings.
