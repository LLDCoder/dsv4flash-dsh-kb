# Excel pending-issue review, 2026-09-16

Source: `NMA AI Chatbot 项目工作簿.xlsx`, sheet `Admin-Chatbot Bug`.
Numbers below are worksheet row numbers, not independent question IDs.
The original workbook's human acceptance status is unchanged.

## Integrated corrections

The prior pending fix (`100dfc1`) was absent from the deployed branch. Its
changes were reconciled with `834e087`, preserving the newer record-identity,
detail-navigation, capability-routing and follow-up behavior.

| Rows | Change and candidate verification |
| --- | --- |
| 6 | Pending Review uses its own response counter, distinct from To Do total. Recognize the selected filter when its label changes from All Statuses to Final Approval. Return the matching bounded rows. The full three-turn sequence passes. |
| 7–8 | Keep the exact application identity across detail and profile follow-ups. Use verified Applicant Overview/Application Overview entries for self-service, as explicitly allowed by the workbook. Do not claim complete personal/form fields were retrieved. Four-turn sequence passes. |
| 11 | Keep the Content source when switching to Completed, including My Decision. Explicitly describe returned records as a partial list. Both turns pass. |
| 12 | Match the exact application identifier and requested queue without unnecessary detail navigation. Both phrasings pass. |
| 13 | Preserve category selection and native identifying/status columns for Books, Movies, Newspapers/Magazines and Video Games. All four turns pass. |
| 14 | Preserve source page, selected tab and metric labels for text and JSON counts. No old numeric values are stored in continuity metadata. Follow-up now gives Content Library → Books navigation. Both turns pass. |
| 20 | Reject unauthorized task access and role overrides, then allow a fresh permitted violations query. All three turns meet the expected permission behavior. |
| 24–25 | Explain Pending Review metric scope and its distinction from approval. Both conversation groups pass. |

## Open items

- Row 9: The erroneous all-time count in response to a completion-period
  question is now suppressed and replaced with an explicit explanation.
  The requested exact weekly completion count is **not yet delivered**.
  The existing Applications frontend labels its date filter Submission Time;
  `MyReviewFilter.Apply` filters `LastUpdatedTime`. In
  `ApplicationAppService`, this can be the latest timeline timestamp rather
  than the task's approval/completion timestamp. Effective Date on Licenses
  is also not completion time. Neither field can establish the requested
  personal weekly completion measure. Do not invent a definition, substitute
  another count, or mark this issue fully resolved.
- Row 26: Only the business name and pending status are populated. There is
  no question or expected outcome to implement or verify.

## Verification

- Candidate uses the current Admin gateway and model configuration, the
  explicitly authorized existing Admin database, and disables database
  initialization and audit cleanup.
- 1,993 backend tests and 4 subtests passed.
- Initial real conversation run: 28 turns. Targeted second run: 14 turns.
  The second run confirms fixes for rows 6, 11, 13 and 14, and the honest
  limitation for row 9. These are authenticated message/history requests
  through the same backend used by the chatbot, not a mocked model or a
  browser-widget click test.
- Accounts are switched serially and GetUserInfo is checked after login.
- Swagger and OpenAPI returned HTTP 200; completion-period evidence rules
  and count-source continuity are documented on the messages endpoint.
- Original Excel statuses remain under human control. Automated verification
  is not a human acceptance sign-off.
