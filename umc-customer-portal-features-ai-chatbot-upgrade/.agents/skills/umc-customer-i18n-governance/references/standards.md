# English and Arabic Localization Standards

## Resource ownership

- Keep one i18next namespace: `translation`.
- Put a key in the resource module that owns the page or reusable component.
- Name by stable meaning and UI role, for example `refundPage.validation.amountRequired`.
- Do not use the English sentence as the key.
- Do not create a generic global key merely because two current strings look similar.
- Reuse a shared key only when action, tone, parameters, and future ownership are identical.

## English baseline

For normal product copy, verify:

- grammar, spelling, sentence case, punctuation, and button action;
- whether a status is a noun, adjective, or action;
- whether validation text states what is required and how to recover;
- whether interpolated numbers and entity names preserve the real domain meaning.

Do not silently rewrite legal, policy, branded, or backend-managed wording.

## Arabic standard

Use formal Modern Standard Arabic consistent with UAE government digital services:

- clear, neutral, direct sentences;
- respectful instructions using `يُرجى` where appropriate;
- consistent NMA name: `NMA`, `National Media Authority`, `الهيئة الوطنية للإعلام`;
- consistent service concepts such as `خدمة`, `طلب`, `تصريح`, `رخصة`, `مخالفة`, `غرامة`, `استرداد`, and `شكوى`.

Do not choose between legally distinct terms such as `اعتراض` and `تظلّم` without the confirmed service or legal context. Preserve service names, reference numbers, amounts, placeholders, and status meaning.

Review Arabic as Arabic, not as word-for-word English. Check agreement, definiteness, prepositions, punctuation, and whether the sentence is complete when shown alone.

## Authority and backend exceptions

### NMA Terms & Conditions

`termsModal` is authority-locked. Its English and Arabic body comes from the NMA source modal and is not governed by the normal English-baseline translation rule.

- Source: `https://srvstg.nma.gov.ae/#/app/MediaContentServices/PublicationsPrintingPermit/?establishmentId=8919`
- Captured: `2026-07-30`
- Evidence record: [Terms authority evidence](terms-authority.md)
- Do not correct `Introdulction` or any upstream punctuation, spacing, grammar, or Arabic defect.
- Preserve nine sections with item counts `3 / 6 / 8 / 3 / 1 / 1 / 1 / 1 / 2`.
- Keep the shared static body used by SignUp and Media License.
- Keep Footer Terms on its existing `getPolicyType("TermsConditions")` backend HTML path.

### Backend content

Display only real bilingual fields returned by the API. Prefer the requested language, then the other confirmed language, then an existing neutral identifier if the current UI already uses one. Do not add guessed aliases or fallback fields.

Use the existing bilingual helpers when their input contract matches. A language check must support variants:

```ts
const isArabic = i18n.language.toLowerCase().startsWith("ar");
```

Do not use `i18n.language === "ar"` or assume every non-English locale is Arabic.

## Runtime patterns

### Static text

```tsx
<CustomButton text={t("payments.actions.confirm")} />
```

Do not use:

```tsx
<CustomButton text="Confirm" />
t("payments.actions.confirm", { defaultValue: "Confirm" })
```

A `defaultValue` can hide missing resources and should not be used for product copy.

### Interpolation

Keep variables identical in both languages:

```json
"sentTo": "A verification code was sent to {{email}}."
```

```json
"sentTo": "تم إرسال رمز التحقق إلى {{email}}."
```

Do not concatenate translated fragments around values.

### Context and dynamic values

Use i18next context only for a finite semantic variation. Register the base key, every allowed context, and the producer file in `dynamicContextKeys`.

Do not construct unrestricted keys from backend text. Map confirmed backend codes to a finite domain and define an explicit unknown-state behavior already approved by the product.

### Rich text

Keep tag names, order, and interpolation variables structurally equivalent. When using `<Trans>`, preserve component indices and confirm both language renderings.

### Errors

Technical exception and backend error text is diagnostic data unless the API contract explicitly guarantees localized, user-safe content:

```ts
catch (error) {
  console.error("Failed to load PDF document:", error);
  CustomMessage.error(t("previewModal.documentLoadFailed"));
}
```

Do not display `error.message`, `response.data.message`, `customMessage`,
`failureReason`, or an English fallback directly. Passing one of these values
through a local helper or temporary variable does not make it localized.
The same rule applies when raw text is first stored in React state or a result
object and only later rendered by JSX.

## RTL and mixed content

- Let i18next direction control page direction; do not infer RTL from English/not-English.
- Treat the locale systems separately: the document and i18next use normalized
  `en` / `ar`; AntD v4 receives the installed `ar_EG` locale object and
  `ConfigProvider direction`; Formily receives the exact registered validation
  key (`en-US` / `ar_EG` in this Portal). Do not copy locale tokens between
  libraries or Portals without checking the installed API and registration.
- Verify icons, breadcrumbs, modal close controls, input alignment, scrolling, and long text.
- Format dates with the selected locale and translate connective words such as “today at”.
- Keep reference numbers, email addresses, URLs, currency, and technical acronyms readable in mixed direction.
- Do not reshape Arabic characters manually or store Arabic Presentation Forms.

## Common review traps

- Zero hardcoded candidates does not prove full coverage.
- A prefix allowlist does not prove a dynamic key exists.
- Search-only “unused” results do not prove a key is dead.
- English text in a catch fallback can appear only during failure and evade happy-path testing.
- Exact `en`/`ar` comparisons break language-region variants.
- Correcting authority text can be a regression even when the correction is linguistically valid.
- Designer schemas, server HTML, static resources, and runtime-generated keys need separate evidence; broad exclusions must be narrow and documented.
