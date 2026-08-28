# i18n Harness Contract

## Commands

Use:

```bash
npm run check:i18n
npm run check:i18n:strict
npm run check:i18n -- --scope=<module>
npm run test:i18n-audit
```

The strict command must fail for:

- invalid or duplicate JSON;
- English/Arabic key or value-type asymmetry;
- interpolation or rich-text structure mismatch;
- duplicate resource mounting or manifest drift;
- missing literal static keys;
- invalid registered dynamic contexts;
- unexpected writing systems in Arabic resources;
- authoritative resource hash drift;
- high-confidence user-visible hardcoded strings;
- raw backend/exception message properties, local helper returns, and direct
  imported helper returns that reach known user-message sinks;
- exact `language === "ar"|"en"` comparisons that break locale variants;
- Terms structure drift or governed removed keys returning.

`unusedCandidates` is a warning list. It is intentionally not a deletion list.
Scoped scans skip unused-candidate analysis because they do not inspect every
possible producer. Use the full repository scan before investigating deletion.

## Dynamic-key evidence

Prefer finite registries over prefixes. A registered dynamic entry must contain:

- base key;
- complete finite values or contexts;
- actual producer file paths;
- English and Arabic resources for every expansion;
- a browser route/state capable of exercising each value.

Current context example:

```js
export const dynamicContextKeys = {
  "personalProfilePage.alerts.expiringSoon": {
    contexts: ["oneDay", "manyDays"],
    producers: [
      "src/pages/EstablishmentProfile/components/AlertBanners/index.tsx",
    ],
  },
};
```

Finite dynamic values use `dynamicValueKeys` with the same producer evidence:

```js
export const dynamicValueKeys = {
  "myRequestsPage.tabs": {
    values: ["ALL", "PENDING_PAYMENT", "PENDING_MODIFICATION"],
    producers: ["src/pages/my-requests/index.tsx"],
    valueSources: [
      {
        file: "src/pages/my-requests/index.tsx",
        identifier: "TOP_APPLICATION_TABS",
        selector: "array-property",
        property: "labelKey",
      },
    ],
  },
};
```

The audit requires every dynamic template call to come from a registered
producer file. It extracts the canonical finite domain from the declared
`valueSources`, requires exact two-way equality with `values`, and requires
every expanded key in both locales. Use `extraValues` only for an explicit,
localized defensive value such as `unknown`; do not use it to hide an open
backend domain. Keep the TypeScript producer parameter narrowed to the same
finite union.

`dynamicKeyPrefixes` is a legacy uncertainty boundary, not proof of use. Narrow
or replace an entry when editing its module. Never add a broad prefix to make
strict mode pass. Authority-locked Terms rendering is the only newly governed
prefix exception; ordinary Formily, status, payment, and account values must use
finite `dynamicValueKeys`.

`externalRuntimePrefixes` is only for content demonstrably supplied by an external runtime contract. Prefer an explicit finite key list. Record the producer and validate both language responses before adding another prefix.

## Key deletion evidence

Delete a key only when all applicable checks agree:

1. no literal `t`, `<Trans>`, schema, route, utility, or test reference;
2. no dynamic producer can construct it;
3. no backend code/status mapping resolves to it;
4. no resource composition or array index consumes it;
5. affected English and Arabic browser routes/states show no raw key or fallback;
6. both locale values and any now-empty parent object are removed together.

For each new deletion, record in the review:

- key and owning module;
- static searches performed;
- dynamic producer/value-domain conclusion;
- route, state, and language exercised;
- replacement key, if any;
- verification date.

Only then add it to the appropriate governed removal/replacement ledger. Existing string-only ledger entries are legacy records; do not use their limited detail as the standard for new removals. If the authenticated route cannot be revalidated, restore the legacy key instead of renewing its deletion from static evidence.

Strict mode rejects legacy deletion evidence that is missing authenticated
English/Arabic route-state verification. Restore the value or replace the
legacy record with complete evidence before approving the deletion. Do not
downgrade this error to a warning or widen an allowlist to keep the value
deleted.

## Hardcoded scanner scope

The AST scanner targets user-visible JSX, known component props, messages, notifications, and selected object fields. It cannot prove:

- semantics or Arabic naturalness;
- visibility of every computed string;
- backend response localization;
- visual RTL correctness;
- completeness of an unknown dynamic value domain.

The raw-message rule follows direct expressions, clearly named local message
variables, same-file helpers, and named helpers imported directly from source
files. It does not implement arbitrary whole-program data-flow analysis.
Review wrapper callbacks, re-export barrels, schema callbacks, and
backend-managed rich content manually.

Every template-literal translator call must be registered as a finite dynamic
value/context domain or a narrow producer-specific prefix. Strict mode rejects
an unregistered template call even when its generated keys currently exist.

Keep exclusions narrow, path-specific, and reviewable. An excluded path must contain editor metadata, technical constants, fixtures, or another verified non-runtime category. Do not exclude an application page merely to silence findings.

When adding a custom UI wrapper, add every user-visible text prop such as `text`, `title`, `description`, `label`, or `placeholder` to `visibleJsxAttributes` and add a negative fixture that first fails without the scanner support.

Use prefix-aware locale checks such as
`i18n.language.toLowerCase().startsWith("ar")`. Do not exempt an exact locale
comparison to make the audit pass.

## Harness change protocol

For every audit rule:

1. Add a minimal failing fixture or unit test.
2. Run `npm run test:i18n-audit` and observe the intended failure.
3. Implement the smallest rule.
4. Fix genuine repository findings; do not weaken the rule for convenience.
5. Run strict audit and tests again.
6. Review false positives and exclusions separately.

Never change a detection rule and its expectation without demonstrating the failing case it is intended to prevent.

Authority-locked resources are additionally protected by a semantic SHA-256
hash recorded with the source URL and capture date. Updating that hash requires
re-capturing the approved source and updating the evidence record; never change
it merely to make the audit pass.

## Manual boundary

After Harness success, manually inspect:

- labels, placeholders, and option text imported from configuration or schema
  modules and rendered later; preserve canonical stored/API values and
  translate only at the display boundary;

- English meaning in page context;
- formal UAE-government Arabic meaning;
- legal/policy authority;
- failure paths and raw errors;
- locale fallback order;
- RTL layout and mixed-direction content;
- all finite dynamic states.

Report these checks separately from automated results. “Harness passed” is not equivalent to “translation approved.”
