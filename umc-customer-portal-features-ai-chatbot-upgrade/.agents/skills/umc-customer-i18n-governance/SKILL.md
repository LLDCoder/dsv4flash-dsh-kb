---
name: umc-customer-i18n-governance
description: Use when adding, changing, reviewing, translating, or deleting user-visible English or Arabic text, i18next resources, dynamic localization keys, RTL behavior, bilingual API fields, or authoritative localized content in the UMC Customer Portal.
---

# UMC Customer i18n Governance

## Purpose

Keep English and Arabic localization correct, reviewable, and provable without changing the existing single `translation` namespace. Treat English as the semantic baseline except for content explicitly locked to an authoritative source.

## Required References

Read [standards.md](references/standards.md) before changing application text, resource values, bilingual API display, or RTL behavior.

Read [harness-contract.md](references/harness-contract.md) before adding dynamic keys, changing the audit, deleting resources, or claiming an i18n review is complete.

## Non-Negotiable Invariants

- Preserve the single i18next `translation` namespace and the existing resource manifest.
- Use lowerCamelCase for module resource directories and manifest paths.
  Preserve existing `components/common/<ResourceGroup>` paths; verify the real
  consumer before adding or renaming a component-scoped resource group.
- Keep Git's filesystem-detected `core.ignorecase` setting.
- Perform case-only renames through a temporary path in two `git mv` steps,
  commit them atomically with every path reference, and validate a clean clone
  on a case-sensitive filesystem.
- Add or change English and Arabic resources together.
- Use confirmed page context and real API fields. Do not invent copy, fields, fallbacks, status values, or business rules.
- Keep user-visible strings out of JSX, TS/TSX constants, validation fallbacks, and raw exception messages.
- Protect authority-locked content. NMA Terms & Conditions must match the captured upstream English and Arabic text exactly, including upstream spelling, punctuation, and language defects.
- Do not delete a key based only on string search or the audit's unused-candidate list.
- Do not hide a missing literal key behind a dynamic-prefix allowlist or `defaultValue`.
- Avoid repository-wide formatting and unrelated renaming.

## Workflow

### 1. Classify the content source

Identify one of:

- Normal product copy: confirm English meaning first, then produce formal UAE-government Modern Standard Arabic.
- Authority-locked static content: copy and compare the exact approved source; do not translate or improve it.
- Backend-managed content: keep the real API chain and validate both language responses; do not replace it with local static text.
- Bilingual API fields: use only fields present in the real response and apply the documented localized fallback order.

If the source cannot be proven, stop that copy change and report the missing evidence.

### 2. Scope by module

Inspect the target component, its paired `src/localization/**/en.json` and `ar.json`, resource registration, callers, and dynamic producers. Reuse an existing key only when its meaning and UI role are identical. Keep new keys under the owning module.

### 3. Implement the smallest complete change

- Update English and Arabic in the same patch.
- Preserve interpolation names, rich-text tags, and `<Trans>` component indices.
- Use `t(...)` at the render or message boundary.
- Prefer storing a stable error category or i18n key in state. Never persist
  arbitrary backend text in state that later reaches JSX.
- Log technical errors for diagnostics; show a localized generic message to users.
- Register finite dynamic context/status values in the Harness with their producer files.
- Represent verified external runtime values as explicit keys where possible;
  do not protect an unknown backend domain with a broad prefix.
- Keep language-region variants such as `ar-AE` working.

### 4. Run the Harness

Run:

```bash
npm run check:i18n:strict
npm run test:i18n-audit
```

Treat errors and hardcoded candidates as blockers. Treat unused candidates as investigation input, not deletion authorization.

### 5. Review runtime behavior

At a `1920px` viewport, verify the affected route in English and Arabic:

- language switch and refresh persistence;
- LTR/RTL direction, punctuation, mixed numbers, dates, currency, and overflow;
- normal, empty, validation, loading, failure, modal, and permission/status states;
- no raw key, English fallback on Arabic UI, Arabic fallback on English UI, or raw backend/exception text.

For dynamic keys, exercise every registered value that the changed producer can emit. For authority-locked content, compare visible text character-for-character after normalizing DOM-only outer whitespace and line breaks.

If a legacy deletion has only static evidence and its authenticated route cannot
be revalidated, restore the key instead of treating the old ledger as approval.

### 6. Complete engineering checks

Run targeted ESLint first, then the relevant repository checks:

```bash
npx eslint <changed-ts-tsx-and-mjs-files>
npx tsc -p tsconfig.app.json --noEmit
npm run build
git diff --check
```

Separate new failures from verified historical failures. Self-review the diff by module and fix every issue introduced by the change.

## Review Output

Report:

- modules and routes reviewed;
- copy/resource/code defects fixed;
- authority-locked or backend-managed content intentionally unchanged;
- Harness, ESLint, typecheck, build, and browser results;
- unresolved dynamic-key, backend-language, legal-term, or RTL risks with exact files and evidence;
- keys removed and the evidence chain for each.

Never report “no omissions” solely because the strict audit returns zero hardcoded candidates.
