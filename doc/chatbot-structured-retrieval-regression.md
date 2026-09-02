# Chatbot Business Response Contracts

This document defines stable customer-facing contracts for the UMC chatbot.
It intentionally does not contain record counts, application numbers, dates,
amounts, audit events, test-account data, or verification history. Those values
change with the signed-in customer and must come only from live evidence.

## Shared Portal Link Contract

Business Skills own the decision to direct a customer to a portal page. They
must use standard Markdown links with a business label and a same-origin path:

```text
[Link label](/portal-path)
```

Do not emit a bare path, a code-formatted path, an absolute deployment hostname,
or an unsafe external URL. The Customer Portal frontend renders safe same-origin
paths as links, so `/refund` resolves under whichever customer portal hostname is
currently deployed.

## Profile Scope

| Business issue | Target Skill or guard | Expected response contract |
| --- | --- | --- |
| A customer asks about profile-bound data for the selected profile. | Any profile-bound Skill, including `application_status`, `application_payment`, `license_permit_status`, and `license_renewal`. | Use only the profile currently selected in the Customer Portal. State the result scope where it helps avoid ambiguity. |
| A customer names a different known profile. | `ProfileScopeGuard` before Tool execution. | Do not query, filter, or aggregate the other profile. Ask the customer to switch profile in the portal before continuing. |
| The portal is in Global View for a profile-bound request. | `ProfileScopeGuard` before Tool execution. | Do not present profile-bound data. Ask the customer to select a concrete profile first. |

## My Requests

| Business issue | Target Skill | Expected response contract |
| --- | --- | --- |
| A customer asks for request status, history, filters, counts, or a request list. | `application_status` | Present only live My Requests data in the selected profile. For a list or summary, the only portal handoff is `[My Requests](/my-requests)`. Do not mention or link an application detail page. |
| A customer asks for pending actions. | `my_requests_pending_actions` | Present only live action-needed items. Keep pending actions separate from request history and issued documents. Use `[My Requests](/my-requests)` when a portal handoff is needed. |
| A customer selects an application by number or ordinal and asks for its detail. | `umc_application_detail` | Describe only the selected application's live detail. A detail link is allowed only when the live detail result provides the selected record's positive numeric `applicationId`; the link must use that actual ID. Never show a placeholder or guessed detail URL. |
| A customer asks which applications await payment or asks for payment detail of a selected application. | `application_payment` | Keep the response read-only. Preserve the public application number from the selected request and do not relabel an internal ID as that number. Use `[My Requests](/my-requests)` for a portal handoff. |

## Licenses and Permits

| Business issue | Target Skill | Expected response contract |
| --- | --- | --- |
| A customer asks for issued License/Permit status, validity, expiry, count, or a named issued document. | `license_permit_status` | Return only live issued-document information; do not substitute application records. Use `[Licenses & Permits](/permits-license)` for a portal handoff. Do not output an application-detail link in a License/Permit list or status response. |
| A customer asks whether an issued document can be modified. | `license_permit_modification_knowledge` | Distinguish live action availability from general process guidance. Do not start a modification. Use `[Licenses & Permits](/permits-license)` when directing to the record action. |
| A customer asks to download an issued document. | `permit_download` | Explain the customer-performed portal action only. Do not download a file or expose a document URL, credential, or access code. Use `[Licenses & Permits](/permits-license)`. |
| A customer asks about renewal or expiry action. | `license_renewal` | Keep issued-document status and any renewal application status separate. Use `[Licenses & Permits](/permits-license)` for document actions and `[My Requests](/my-requests)` for an existing renewal application. A request-detail link follows the selected-record rule above. |
| A customer asks how to apply for a named license or permit. | `license_application_knowledge` | Provide evidence-based service requirements and process only. Do not create or submit an application. Use `[Services](/services)` for a service handoff. |

## Payments, Refunds, and Enquiries

| Business issue | Target Skill | Expected response contract |
| --- | --- | --- |
| A customer asks for a completed-payment receipt. | `payment_receipt` | Use only live transaction evidence. Do not fabricate a receipt URL or claim a download completed. Use `[Payments](/payments)` for the portal handoff. |
| A customer asks to request a refund. | `payment_transaction_history` or the customer deployment's refund Skill. | Explain the applicable portal action without claiming that a refund was submitted. When a portal handoff is configured, render `[Refunds](/refund)`. |
| A customer asks to create a complaint for a delayed application. | `complaint_create` | Collect the required context and show a preview before any write action. When the customer must continue in the portal, render `[Enquiries and Complaints](/complaints)`. |
| A customer asks to follow up on or reopen an enquiry. | `enquiry_followup` or `enquiry_reopen` | Describe only the available enquiry action and do not claim it completed without a successful write response. Use `[Enquiries and Complaints](/complaints)` for a portal handoff. |

## Skill Authoring Checklist

For every new or changed business Skill:

1. State the business issue it owns and the issue boundaries it does not own.
2. Describe the response contract, not sample account data or a fixed answer.
3. Add a portal handoff only when the customer can usefully continue there.
4. Use `[Business label](/same-origin-path)` for a handoff link.
5. For a record-detail link, require both an explicit customer selection and a
   real identifier from live evidence. Keep the URL template only in that
   selected-record Skill, never in a list or summary Skill.

## Customer Intent Regression Cases

Run each case in a new conversation with an authenticated customer session.
Assert the target Skill and the stated customer-facing behaviour, but do not
assert a fixed record count or account-specific outcome. When a required record
is absent, the response must clearly say so, remain within the selected profile,
and request a reference or profile switch only when needed.

| ID | Customer question | Natural-language intent | Target Skill | Acceptance criteria |
| --- | --- | --- | --- | --- |
| CI-01 | `My profile is under review. Can I start a new application?` | Determine whether the current profile can start a new request. | `profile_status` | Explain the profile-review constraint without treating application counts as profile approval. If another profile is relevant, direct the customer to switch profiles. |
| CI-02 | `Which services am I eligible to apply for under my current profile?` | List services available for the selected profile. | `service_eligibility` | Query the current account's collected services first. Return candidate services and request only genuinely missing activity details; do not ask the customer to repeat known profile data. |
| CI-03 | `My application is showing as Pending Payment. What should I do next?` | Find the pending-payment request and explain the next portal step. | `application_payment` | Query only Pending Payment applications. Preserve the public application number, provide returned payment details where available, and never start, retry, or confirm a payment. |
| CI-04 | `Can you check the latest status of my application?` | Retrieve the newest request status in the selected profile. | `application_status` | Query My Requests in the default newest-first order. State the selected-profile scope and request an application number only if a specific record cannot be identified. |
| CI-05 | `Where can I download my issued permit?` | Direct the customer to download an issued document. | `permit_download` | Direct the customer to `[Licenses & Permits](/permits-license)`. Do not download the file, expose its URL, or retrieve or reveal an access code. |
| CI-06 | `Was my latest payment successful, and where can I find the receipt?` | Check the latest payment and identify the receipt action. | `payment_receipt` | Use only live transaction evidence. Confirm success only when returned by the transaction record, and describe the portal's receipt action without fabricating a URL or downloading the receipt. |
| CI-07 | `My license is expiring soon. What should I do?` | Give renewal and expiry guidance. | `license_renewal` | Retrieve renewal evidence and explain the renewal deadline, post-expiry restriction, and portal next step. Keep general renewal guidance distinct from the status of a particular issued document. |
| CI-08 | `I received a fine notification. Can I appeal it?` | Check whether a notified violation may be appealed. | `fine_appeal` | Route to appeal, not fine payment. Check available appeal or violation evidence first; ask for a violation reference when required, and do not submit an appeal. |
| CI-09 | `I cannot find the right service for my business. Can you help?` | Recommend the appropriate service for a business activity. | `service_discovery` | Request the activity, establishment type, and emirate when missing. Separate federal candidates from any local-authority handoff and do not represent candidates as a final eligibility decision. |
| CI-10 | `I have a complaint about a delayed application. How can I submit it?` | Explain how to prepare and submit a delay complaint. | `complaint_create` | Identify the Complaint type, required application reference and supporting information. Provide a portal handoff or preview only; do not submit, update, or cancel the complaint. |
| CI-11 | `I want to follow up on an enquiry I submitted earlier.` | Find an existing enquiry and explain the follow-up action. | `enquiry_followup` | Query the current account's enquiries first. Show the matching or most recent enquiry when possible, then request a reference only to disambiguate; do not claim a follow-up was sent. |
| CI-12 | `Can I reopen my resolved enquiry?` | Determine the available action for a resolved enquiry. | `enquiry_reopen` | Query the current account's enquiries first. Do not assume a resolved enquiry can or cannot be reopened before checking the record; explain the verified related-message or linked-enquiry alternative when reopening is unavailable. |
| CI-13 | `I cannot complete payment. How can I raise a technical enquiry?` | Raise a technical support enquiry for a payment problem. | `technical_enquiry` | Route to technical enquiry, not payment history or receipt. Retrieve the available enquiry type, ask for any available transaction/error evidence and screenshots, and do not retry payment or submit the enquiry automatically. |
| CI-14 | `I want to renew licence number <issued-document-number-in-current-profile>.` | Find a specific current issued document and report its renewal state. | `license_renewal` | Query issued License/Permit records before using knowledge. If exactly one record matches, report only its returned type, number, status, dates, and available actions. Do not require the customer to provide the document type after they supplied a unique number. |
| CI-15 | `I want to renew licence number <nonexistent-document-number>.` | Handle an unmatched document identifier safely. | `license_renewal` | State concisely that no issued record with that number exists in the currently selected profile. Offer `[Licenses & Permits](/permits-license)`. Do not cite any unrelated application, renewal request, count, or generic policy as if it concerns the supplied number. |
| CI-16 | In Global View: `I want to renew licence number <issued-document-number>.` | Enforce the selected-profile boundary before a personal lookup. | `license_renewal` with `ProfileScopeGuard` | Ask the customer to select a concrete profile, and do not also demand the document type. Do not expose or infer profile-bound document data until the profile is selected. |
| CI-17 | `What documents do I need to renew a Commercial Media Licence?` | Provide general renewal requirements without treating them as the customer's record. | `license_renewal` | Use knowledge evidence for the general process. Do not claim that the customer has a matching document, a renewal application, or an available action without live issued-document evidence. |
| CI-18 | `How do I apply for a Text Permit?` | Look up a named new-application service and safely handle an unknown service name. | `license_application_knowledge` | Use knowledge search. When no verified service guidance exists, say so without guessing requirements, then ask for the intended media activity and offer `[Services](/services)`. The final answer must not expose tool names, parameters, protocol text, or partial tool output. |
| CI-19 | `How many requests do I have?` / `我有多少个申请？` / `كم طلبًا لدي؟` | Count the selected profile's My Requests across supported languages. | `application_status` | Return only live My Requests evidence and, when useful, a status breakdown. Do not route to general knowledge, treat the question as a licence count, or assert a fixed count in the test. |
