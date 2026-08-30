# My Requests Follow-up Execution Results

Execution target: local DSH at `http://localhost:18180/`  
Runtime mode: `shadow`  
Account: configured local UMC test account  
Scope: 5 conversations, 10 messages, no image cases

## Case 1: List My Requests and Filter by Status

### Turn 1

**Question:** `What applications do I have in My Requests?`

- Keyword Skill: `application_status`
- LLM Skill: `application_status`
- Tool: `umc.applications`
- Result: Passed. The assistant returned 37 applications with status counts: Draft 7, Under Review 7, Pending Payment 3, Completed 19, Cancelled 1.

### Turn 2

**Question:** `Show only the ones that are not completed.`

- Keyword Skill: `general`
- LLM Skill: `application_status`
- Tool: none
- Result: The answer correctly used the previous list and reported 18 non-completed records, but the keyword route did not retain the application Skill.

## Case 2: Pending Payment Applications

### Turn 1

**Question:** `Do I have any applications waiting for payment?`

- Keyword Skill: `application_payment`
- LLM Skill: `application_payment`
- Tool: `umc.applications`
- Result: Passed. The assistant found 3 Pending Payment applications totaling AED 600.00 and did not initiate payment.

### Turn 2

**Question:** `For the oldest one, what service is it for, how much is due, and what is its current payment status?`

- Keyword Skill: `payment_receipt`
- LLM Skill: `application_payment`
- Tool: none
- Result: The answer correctly identified application `MC-3-203-2852058`, Publication Printing Permit, AED 200.00, Awaiting Payment. However, the keyword route changed to the unrelated receipt Skill and no payment-detail tool was called.

## Case 3: Application Detail and Timeline

### Turn 1

**Question:** `Please show me the details for application MC-3-203-2852058.`

- Keyword Skill: `general`
- LLM Skill: `application_payment`
- Tool: none
- Result: Failed. The assistant claimed it had no connected application lookup and did not call `umc.application_detail`.

### Turn 2

**Question:** `Which step is it currently waiting for, and what processing time does the portal show?`

- Keyword Skill: `service_fees`
- LLM Skill: `service_fees`
- Tool: `knowledge.search`
- Result: Failed for My Requests. The answer gave general portal guidance instead of live application timeline data.

## Case 4: Recent Submitted Applications

### Turn 1

**Question:** `Which Media License applications have I submitted recently?`

- Keyword Skill: `license_application`
- LLM Skill: `license_application`
- Tool: `knowledge.search`
- Result: Failed for My Requests. The assistant treated this as a general new-license knowledge question and did not query the application list.

### Turn 2

**Question:** `Keep only the Submitted and Pending Payment applications, and sort them from newest to oldest.`

- Keyword Skill: `application_payment`
- LLM Skill: `application_payment`
- Tool: `umc.applications`
- Result: Partially passed. The assistant queried live applications and correctly explained that the API uses `Under Review` rather than a literal `Submitted` status. It returned 3 Pending Payment and 3 Under Review records sorted newest first.

## Case 5: Application Record and Fee Details

### Turn 1

**Question:** `What are the details of application APP-2026-000001?`

- Keyword Skill: `general`
- LLM Skill: none
- Tool: none
- Result: Failed. The application number format was not recognized as a live My Requests lookup.

### Turn 2

**Question:** `What service is it for, what fee and currency are shown, and what is its current status?`

- Keyword Skill: `service_fees`
- LLM Skill: `service_fees`
- Tool: `knowledge.search`
- Result: Failed for My Requests. The answer searched general fee knowledge and could not retrieve the application record.

## Summary

- Fully correct: 1 turn (Case 2 Turn 1)
- Correct answer but routing/tool weakness: 3 turns (Case 1 Turn 2, Case 2 Turn 2, Case 4 Turn 2)
- Incorrect My Requests handling: 6 turns
- Main issues observed:
  1. Contextual follow-ups are not reliably retained by the keyword route.
  2. Application numbers in formats such as `MC-3-203-2852058` and `APP-2026-000001` are not consistently recognized by deterministic routing.
  3. `Media License applications` is being captured by the general license-application knowledge route instead of My Requests.
  4. LLM shadow classification can identify the right Skill, but shadow mode still executes the keyword result.

