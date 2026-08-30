# My Requests Follow-up Test Cases

These cases are based on the customer portal's **My Requests** module. They cover read-only questions and should not trigger payment, edit, cancel, duplicate, or submit actions.

## 1. List My Requests and Filter by Status

**User:**

> What applications do I have in My Requests?

**Follow-up:**

> Show only the ones that are not completed.

**Expected focus:** Query the application list, then filter by the returned application status. Preserve the distinction between Draft, Submitted, Pending Payment, and Completed.

## 2. Pending Payment Applications

**User:**

> Do I have any applications waiting for payment?

**Follow-up:**

> For the oldest one, what service is it for, how much is due, and what is its current payment status?

**Expected focus:** Identify Pending Payment applications from My Requests, then query the selected application's payment details. Do not initiate or confirm payment.

## 3. Application Detail and Timeline

**User:**

> Please show me the details for application MC-3-203-2852058.

**Follow-up:**

> Which step is it currently waiting for, and what processing time does the portal show?

**Expected focus:** Locate the application, return its live service/status/timeline data, and avoid inferring a decision or milestone that is not present in the response.

## 4. Recent Submitted Applications

**User:**

> Which Media License applications have I submitted recently?

**Follow-up:**

> Keep only the Submitted and Pending Payment applications, and sort them from newest to oldest.

**Expected focus:** Use the My Requests list with the appropriate status and time/sort filters. State the result scope and the sort order used.

## 5. Application Record and Fee Details

**User:**

> What are the details of application APP-2026-000001?

**Follow-up:**

> What service is it for, what fee and currency are shown, and what is its current status?

**Expected focus:** Return service, fee, currency, and status from the live application detail response. Do not replace application status with an issued License/Permit status.
