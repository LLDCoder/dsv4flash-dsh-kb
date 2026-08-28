# Terms & Conditions Authority Evidence

- Source URL: `https://srvstg.nma.gov.ae/#/app/MediaContentServices/PublicationsPrintingPermit/?establishmentId=8919`
- Captured on: `2026-07-30`
- Capture method: authenticated browser session, opening the service's
  `Terms & Conditions` modal and reading the visible English and Arabic text.
- Runtime resources: `src/localization/termsModal/en.json` and
  `src/localization/termsModal/ar.json`.
- Shared renderer: `src/components/common/TermsContent/index.tsx`.
- Consumers: SignUp and Media License static Terms modals.
- Footer exception: `getPolicyType("TermsConditions")` remains backend-managed
  HTML and is not replaced by the static resource.

Expected structure:

- Introduction / `مقدمة`
- Nine sections
- Clause counts: `3 / 6 / 8 / 3 / 1 / 1 / 1 / 1 / 2`

Captured runtime-resource drift hashes:

- English SHA-256:
  `640f851c7f368b5d6de07cbc737d79ad14971d61508842c89bb89be18ec862e7`
- Arabic SHA-256:
  `6802f74d78c6b2275cb4b98a2b3a71880c22fcdf966ab8589a54c9ae4c2e034a`

The hashes use SHA-256 over `JSON.stringify` of the parsed locale object. The
Harness compares them through `authoritativeResourceHashes`. They prove that
the accepted 2026-07-30 runtime JSON has not changed; they do not independently
prove the original upstream capture, that the upstream modal is unchanged
today, or anything about the Footer's backend-managed HTML.

The captured source includes known defects such as `Introdulction`, spacing and
punctuation inconsistencies, and Arabic grammar issues. Preserve them exactly.
Do not update a hash unless the authenticated source modal is re-captured in
both languages and the text is compared character-for-character after
normalizing only DOM outer whitespace and line breaks. Screenshots are visual
support, not a complete text authority. This repository does not retain an
independent raw upstream DOM snapshot, so revalidating the upstream source
requires a fresh capture. Credentials are not part of this record.
