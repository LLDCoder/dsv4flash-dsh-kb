# Responsive Design Handover — UMC Customer Portal

Audience: developers continuing responsive work, and AI agents making any UI change.
Scope: everything done on the `feat/responsive` effort (merged into `feature`) plus the
follow-up responsive fixes. Read this **before** touching any `.less` file or page layout.

Design reference: desktop mockups are drawn at **1920px** (`@design-width` in
`src/styles/mixins.less`). Browser testing defaults to a 1920px viewport unless a task
says otherwise (see `AGENTS.md`).

> **For developers only (not for AI agents):** the source design file is on Figma —
> [Responsive Feedback](https://www.figma.com/design/ooD1rs3cx84K59ZkmkekHi/Customer-Portal?node-id=9027-211028).
> AI agents must not attempt to fetch or rely on this link; the sizes and patterns in
> this document are the authoritative reference for agents.

---

## 1. Core architecture: px → rem build pipeline

All stylesheet `px` values are converted to `rem` automatically at build time by
`postcss-pxtorem`, configured in `vite.config.ts`:

```js
pxtorem({
  rootValue: 16,        // 1rem = 16px — write px at design size, output is /16
  propList: ["*"],      // every property is converted
  unitPrecision: 5,
  replace: true,
  mediaQuery: false,    // @media query params stay in px — breakpoints are px on purpose
  minPixelValue: 1,     // everything ≥ 1px is converted (1px borders become 0.0625rem)
  exclude: /node_modules/i,  // AntD/vendor CSS is left untouched
})
```

### Rules that follow from this

1. **Write plain `px` in `.less`/`.css` files at the 1920px design size.** Do not write
   `rem` by hand in stylesheets; the build does the conversion. Hand-written `rem` is
   allowed only where it already exists (some mixins/legacy rules) — don't convert back.
2. **Inline styles in TSX are NOT converted.** `style={{ width: 200 }}` stays `200px`.
   Avoid size-bearing inline styles; put sizing in the colocated `.less` file. If an
   inline style is unavoidable, use `rem` manually (`width: "12.5rem"`).
3. **Media query breakpoints stay in `px`** (`mediaQuery: false`). This is intentional:
   breakpoints track viewport width, not user font size. Never write breakpoints in rem.
4. There is no dynamic root-font-size script. `html` keeps the browser default (16px),
   so `rem` sizing scales with the **user's font-size / accessibility settings**, not
   with viewport width. Responsiveness across viewports comes from media queries and
   fluid grids (sections below), not from rem scaling.
5. The pxtorem plugin factory is wrapped with `Object.assign(() => …, { postcss: true })`
   so each build gets isolated plugin state (`fix(build): isolate pxtorem plugin state`,
   `50a943b5`). Don't refactor this into a shared singleton instance — parallel/repeated
   builds broke on shared state before.

### Build guard

`scripts/check-css-rem-build.js` (run as `npm run check:css-rem`, wired into
`build:daypop` and `build:client`) scans `dist/assets/*.css` and **fails the build** if
known layout/header rules are still in px (e.g. `.header{padding:27px`) or if the
expected rem-converted rules are missing. If you rename `.header` / `.menu` /
`.layout-content` / `.mainbac` classes or change their design values, update this script
in the same commit.

---

## 2. Breakpoints

Approach is **desktop-first**: base styles target 1920px, `@media (max-width: …)`
overrides narrow things down. Canonical values used across the codebase:

| Breakpoint | Meaning / typical use |
|---|---|
| `min-width: 1920px` | Full design width extras |
| `max-width: 1919px` | Anything below full design width |
| `max-width: 1440px` / `1439px` | Small desktop |
| `max-width: 1280px` / `1279px` | Narrow desktop — forms stack to 1 column, grids drop 3→2 columns |
| `max-width: 1024px` / `1023px` | Tablet — the second most used breakpoint (34 uses) |
| `max-width: 768px` | **Mobile — the primary breakpoint (78 uses); matches `useIsMobile`** |
| `max-width: 576px` / `480px` | Small phones |
| `max-width: 376px` / `360px` | iPhone SE / smallest supported |

Rules:

- New code should stick to this ladder — prefer `768px` (mobile), `1023px` (tablet),
  `1279px` (narrow desktop). Don't invent new values like `800px` or `950px`.
- `.respond-to(@breakpoint)` mixins exist in `src/styles/mixins.less`
  (`xs`=480, `sm`=576, `md`=768, `lg`=992, `xl`=1200) but most page code writes
  `@media` blocks directly; either is acceptable, direct `@media` is the dominant style.
- CSS breakpoints and JS hooks must agree: `useIsMobile()` is hard-coded to
  `(max-width: 768px)`. If a component swaps layout in JS at 768 and in CSS at some
  other width, it will glitch in between.

---

## 3. Layout patterns (the rules we standardized)

These patterns were applied across the portal and are the *house style*. Reuse them
instead of inventing new ones.

### 3.1 Fluid grids with capped tracks — `repeat(N, minmax(0, <cap>px))`

Cards and form fields have a **design width of 528px**. Never give them a fixed width;
cap them and let them shrink:

```less
// MyAccount establishment cards: 3 → 2 → 1 columns, tracks capped at design width
.establishment-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 528px));
  gap: 24px;
  @media (max-width: 1279px) { grid-template-columns: repeat(2, minmax(0, 528px)); }
  @media (max-width: 768px)  { grid-template-columns: minmax(0, 1fr); }
}
```

- `minmax(0, 528px)` means: never exceed the design width (cards stay left-packed on
  ultra-wide screens), always shrink on narrow desktops instead of overflowing.
- Grid/flex children that must shrink need `min-width: 0` — grid/flex items default to
  `min-width: auto` and refuse to shrink below content width, which is the #1 cause of
  horizontal overflow we fixed.

### 3.2 Form fields — `width: 100%; max-width: 528px`

Never `width: 528px` on a field or its `.ant-select`/`.ant-input`. Always:

```less
.form-item-first {
  width: 100%;
  max-width: 528px;
  .ant-select { width: 100%; }
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 528px)); // not repeat(3, 1fr) with fixed children
  gap: 24px;
}
```

Reference implementations: `src/pages/EstablishmentProfile/index.less`,
`src/pages/MyAccount/index.less`.

### 3.3 Detail-page summary strips — fixed card minimum + horizontal scroll

Detail headers (My Requests detail, Complaints detail, Pay Fines detail, Permits…)
show a row of status/info cards. Standardized rule: **cards keep a readable minimum
width (280px) and the strip scrolls horizontally** rather than wrapping or squashing:

```less
.detail-header {
  display: flex;
  align-items: center;
  overflow-x: auto;        // strip scrolls when cards don't fit
  // no flex-wrap
}
.detail-header-item {
  flex: 1 0 auto;          // fill wide screens, never shrink below min
  min-width: 280px;
}
```

### 3.4 Detail-page sidebars — fixed 380px, stack on mobile

All detail pages align their right sidebar to the My Requests detail sidebar:

```less
.area-right { flex: 0 0 380px; min-width: 0; }

@media (max-width: 1023px) {
  .area-left  { order: 1; }
  .area-right { flex: none; width: 100%; order: 0; }  // flex: none is required —
  // leaving flex-basis: 380px while setting width: 100% breaks the stack
}
```

### 3.5 Forms inside detail/service pages — stack below 1280px

`src/components/common/FormliyView/index.less` globally stacks form layouts when the
left column gets too narrow:

```less
@media (max-width: 1279px) {
  .ant-formily-grid-layout {
    grid-template-columns: 1fr !important;
    > * { grid-column: 1 / -1 !important; }
  }
  .ant-row > .ant-col-6, .ant-row > .ant-col-8, .ant-row > .ant-col-12 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
```

- At ≥1280px the designed multi-column grid from the Formily schema applies untouched.
- This also covers custom form-card components that hard-code `Col span={12}`
  (ScriptPublicationForm, PublicationForm, FilmTrailerForm, …).
- **Modals render in portals outside this scope** and keep their own column layouts —
  don't "fix" a modal by widening this selector.

### 3.6 Modals — fixed design width with a viewport escape hatch

AntD modals with a fixed design width must never exceed the viewport:

```less
.some-modal {
  width: 900px !important;
  max-width: calc(100vw - 32px);  // 16px margin each side on phones
}
```

### 3.7 Auto-fill card grids (Home services)

Where the column count should be derived instead of stepped by breakpoints:

```less
// drops 3 → 2 → 1 columns as width narrows; min(100%, 280px) prevents
// overflow when the container itself is narrower than the track minimum
.services-list {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
}
```

### 3.8 CTA rows stay on one line

Service-card footers (Home) deliberately have **no `flex-wrap`** — CTAs stay on one
row and truncate/shrink instead of wrapping into a tall card. Don't re-add `flex-wrap`
to `.item-footer`.

---

## 4. JS responsive utilities (`src/hooks/`)

| Hook | Contract |
|---|---|
| `useMediaQuery(query \| query[], initialValue?)` | SSR-safe `matchMedia` subscription; array = AND of all queries. |
| `useIsMobile()` | `useMediaQuery('(max-width: 768px)')` — the **only** sanctioned JS mobile check. Used by layout Header, Login, Payments, Services, my-requests, ViolationsFines, Refund, Complaints, PermitsLicense, ActionFooter, PublicLayout, HomeAction. |
| `useDeviceType()` | UA-sniffing → `1` mobile / `2` desktop / `3` tablet. For API payloads/analytics only — **never** for layout decisions; use `useIsMobile`/media queries for layout. |
| `useFilterOverflow()` | Content-driven (not breakpoint-driven) toolbar collapse. See below. |

### `useFilterOverflow` — dynamic filter-row collapse

Filter toolbars (ViolationsFines, my-requests, …) don't collapse at a fixed breakpoint —
they collapse **when their content actually overflows**, which survives locale switches
(Arabic labels are wider) and any number of filters. Usage pattern:

```tsx
const [filterRef, filtersOverflow] = useFilterOverflow();
<FilterToolbar filtersRef={filterRef} compact={filtersOverflow} />
// toolbar root gets a "--compact" modifier class when compact is true
```

Contract (violating these silently breaks the measurement — documented in the hook's
JSDoc, `src/hooks/useFilterOverflow.ts`):

1. Attach the ref to the **block-level** flex row whose children must all fit on one
   line (including any CTA sharing the row).
2. In the **full** layout: fixed-width items get `flex-shrink: 0`; flexible items get a
   `min-width` floor. A freely shrinking item measures as "fitting" at any width.
3. Styles that relax those floors for the compact layout **must be scoped to the
   compact-state class** (e.g. `.toolbar--compact`) so they never apply while the full
   layout is being measured.

---

## 5. RTL (Arabic)

- `App.tsx` sets `dir="rtl"` and `lang="ar"` on `<html>` when the language starts with
  `ar`; page overrides use `html[dir="rtl"] .selector { … }`.
- Prefer **CSS logical properties** in new code (`inset-inline-start`, `margin-inline-end`,
  `padding-inline`) over left/right pairs — the layout header already uses
  `inset-inline-start` and the rem build-check asserts on it.
- Responsive + RTL interact: anything absolutely positioned or using directional
  margins must be verified in both directions at mobile widths. When merging, keep the
  responsive RTL rules (this was an explicit conflict-resolution decision in
  `2bd7b115`).

---

## 6. Styling toolbox

- `src/styles/mixins.less`: `@design-width: 1920px`, `@base-font-size: 16px`,
  `.px2rem(@px)` / `.size-rem(w, h)` (manual rem conversion where needed),
  `.respond-to(xs|sm|md|lg|xl)`, `.flex-center/between/column`, `.text-ellipsis(-multi)`,
  `.hide-scrollbar`, `.custom-scrollbar`, `.card`, `.aspect-ratio`, …
- `src/styles/variables.less`: theme colors, injected globally into every Less file via
  the Vite `modifyVars` hack — never re-import it manually, and put new shared design
  tokens here.
- `src/index.css`: global reset — `box-sizing: border-box` everywhere, scrollbars
  visually hidden globally (`::-webkit-scrollbar { display: none }`). Horizontal-scroll
  strips (§3.3) therefore scroll without a visible scrollbar; that's expected.

---

## 7. What was changed (commit map)

Chronological summary of the responsive effort, for archaeology:

| Commit | What / where |
|---|---|
| `d1693154`, `d850c191`, `91145444` | Align form styling; convert layout padding and header sizing to rem (`src/layout/index.less`). |
| `56be75d0`, `94fc2af7`, `c7020b84`, `50a943b5` | Build plumbing: force Vite config in prod, load/inline the rem PostCSS config for Docker builds, isolate pxtorem plugin state. |
| `5645ead7` | My Requests card scroller made responsive. |
| `6e89ba18` | Login, MediaLicense, filter icons, my-requests detail — fully responsive on mobile (17 files). |
| `e7e7af74` | Summary panels, tables, cards, partner details, submission modal — responsive on mobile (29 files, incl. TransactionDetail, ViolationsFines detail). |
| `e192ba88` | Home services grid + Payments wallet card overflow at narrow widths. |
| `fbf61d3a` | Detail sidebars standardized to 380px; multi-column forms restored above 1280px (FormliyView global rule); modal `max-width: calc(100vw - 32px)`. |
| `be193f2d` | Detail summary strips: `min-width: 280px` cards + `overflow-x: auto`; Home CTAs kept on one row (ComplaintsDetails, PayFinesDetail, PermitsLicense, TransactionDetail, ViolationsFines PageShared). |
| `b7d58f2d` | Payment pages responsive fixes, incl. CardPayment success/failure pages. |
| `223113d9` | Mobile responsiveness for payment flows; introduced `useFilterOverflow` dynamic toolbar collapse (15 files). |
| `da2ed492` | MyAccount: profile cards capped at 528px; establishment grid 3/2/1 columns. |
| `10c427b0` | EstablishmentProfile: fluid form grid with 528px field caps. |
| `2bd7b115` | Merge decision: keep responsive RTL rule while taking SignUp layout improvements. |

Pages covered by the effort: Login, SignUp, Verification, Home, Services, ServiceCard,
MediaLicense, my-requests + Detail, TransactionDetail, Complaints + ComplaintsDetails,
ViolationsFines (+ ViolationDetail + PageShared), PayFinesDetail, PermitsLicense,
Payments, PaymentCenter/CardPayment (success/failure), Refund, MyAccount,
EstablishmentProfile, layout Header, FormliyView, designable components
(AddressList, BookList).

---

## 8. Rules for AI agents (checklist)

When making **any** UI change in this repo:

1. Write `px` in `.less` files at 1920px design scale — the build converts to rem.
   Never put sizes in TSX inline styles (pxtorem does not touch them).
2. Desktop-first: base rules for 1920px, then `@media (max-width: …)` overrides using
   the ladder in §2 (`768px` mobile, `1023px` tablet, `1279px` narrow desktop).
3. In JS, use `useIsMobile()` for mobile checks — never `window.innerWidth` reads,
   never a new `matchMedia` subscription, never `useDeviceType()` for layout.
4. New cards/fields: `width: 100%` + `max-width: 528px` (design cap), never fixed
   widths. Grid tracks: `minmax(0, <cap>px)`, never bare `1fr` with fixed-width children.
5. Add `min-width: 0` to any grid/flex child that must shrink.
6. Detail summary strips: `overflow-x: auto` container + `min-width: 280px` items.
   Detail sidebars: `flex: 0 0 380px`, stacked with `flex: none; width: 100%` ≤1023px.
7. Fixed-width modals need `max-width: calc(100vw - 32px)`.
8. Filter/toolbar rows use `useFilterOverflow` — respect its measurement contract (§4):
   shrink floors in the full layout, compact relaxations scoped to the compact class.
9. Check RTL: prefer logical properties; verify `html[dir="rtl"]` at mobile widths.
10. Don't restyle AntD by upgrading APIs — this is `antd@4.22.8` on React 17
    (see `AGENTS.md` and `skills/antd-4-compatibility`).
11. After changes run: `npm run lint`, `npm run typecheck`, `npm run build`; for
    deployment builds `npm run check:css-rem` must pass. Browser-verify at 1920, 1280,
    1024, 768 and 375 wide (default viewport 1920 per `AGENTS.md`).
12. Regression watch-list (things we already fixed once — don't reintroduce):
    horizontal page scroll at narrow desktop widths, fields overflowing their card,
    wrapped CTA rows on Home service cards, modals wider than the viewport,
    filter toolbars flickering between full/compact layouts.
