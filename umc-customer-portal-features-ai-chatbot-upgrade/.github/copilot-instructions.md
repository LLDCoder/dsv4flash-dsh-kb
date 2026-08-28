# Copilot Instructions

## Build, lint, and local run commands

| Task | Command | Notes |
| --- | --- | --- |
| Install dependencies | `npm install` | `postinstall` runs `patch-package`, so dependency changes should be followed by a fresh install. |
| Start the dev server | `npm run dev` | Vite serves on port `5174` and applies the proxy rules in `vite.config.ts`. |
| Lint | `npm run lint` | Uses the flat ESLint config in `eslint.config.js`. |
| Build | `npm run build` | Runs `cross-env DISABLE_ESLINT_PLUGIN=true vite build`. |
| Preview the production build | `npm run preview` | Serves the built `dist/` output. |
| Test suite | _None configured_ | There is no `test` script or test runner wired in `package.json`. |
| Single test | _None configured_ | Add a test runner before documenting per-test commands. |

## High-level architecture

1. **Boot and runtime config**: `src/main.tsx` sets the root `rem` scale from viewport width, then waits for `initAppConfig()` before rendering the app. `src/config/appConfig.ts` loads `public/config.json` at runtime and falls back to Vite env vars, so runtime configuration can come from either deployed static config or build-time env.
2. **Routing model**: the app uses React Router v5 with a shared `history` instance from `src/utils/history.ts`. `src/routes/routes.tsx` is the menu and breadcrumb source of truth, while `src/routes/index.tsx` auto-discovers `src/pages/*/index.tsx` with `import.meta.glob()` and lazily builds route elements from the `page` names in route metadata.
3. **Protected shell vs public pages**: routes under `/` render inside `Layout` and `AuthBoundary`; public pages such as login, signup, forgot-password, pay-fines, and track-application are declared separately in `src/routes/index.tsx`. `AuthBoundary` enforces login and also triggers a 15-minute inactivity logout timer.
4. **API layer**: `src/services/*.ts` are thin wrappers around `src/utils/request.ts`. That request helper injects `Accept-Language` and bearer token headers, strips nullish GET params, reroutes some URL families to alternate base URLs (`/PayFines/` and `/ContentLibrary/`), unwraps the backend response contract, and centralizes toast/error handling through `CustomMessage`.
5. **State model**: app-wide state is primarily Zustand, not Redux. Stores in `src/store/` persist important flow state to localStorage, especially `user-storage` and `services-storage`, which many pages rely on for identity, selected profile, service metadata, application IDs, and saved Formily data.
6. **Dynamic service flows**: large service pages such as `src/pages/MediaLicense/index.tsx` are API-driven workflows. They fetch `formsList` and service metadata from the backend, then render each step through `FormliyView`, which parses `formData` JSON, creates a Formily form instance, and renders the schema with a custom `SchemaField` component registry. Multi-step progress, selected service metadata, application IDs, and saved Formily values are coordinated through the services store.
7. **Notifications and real-time updates**: `NotificationProvider` wraps the whole app in `src/App.tsx`. It combines notification API calls with SignalR subscriptions from `useNotificationSignalR`, and SignalR ultimately reads its hub URL from the runtime app config.
8. **Localization and UI shell**: translations live in `src/localization/locales/*.json`, with `src/localization/config.ts` bootstrapping `i18next`. `App.tsx` switches the Ant Design locale and then reloads the page on language changes, so locale-sensitive changes need to account for a full reload rather than hot language swapping.

## Key conventions

- Add new authenticated pages as `src/pages/<PageName>/index.tsx`, then register menu and path metadata in `src/routes/routes.tsx`. Route loading is automatic only when the `page` value matches the page directory name.
- Prefer adding or extending functions in `src/services/*.ts` instead of calling Axios directly from page components. If a request needs custom UX, use `skipErrorToast` and `customErrorMessage` from `RequestConfig` rather than duplicating toast logic.
- When changing auth flows, update both `authStorage` and the persisted Zustand user state. Notification refresh behavior depends on token storage, `currentProfileId`, and the app's auth event pattern.
- Treat language switches and profile/identity switches as reload boundaries. Existing flows intentionally call `window.location.reload()` after those operations.
- Keep cross-page workflow state in Zustand stores under `src/store/`; large pages keep transient UI state locally and only persist the parts that must survive route changes or refreshes.
- Expect runtime config to come from both env vars and `public/config.json`. Changes to SignalR, API base URLs, or external integrations should check both sources before assuming behavior.
- The repo has Husky hooks that run `node checkChinese/check-chinese.js` on `pre-commit` and `node checkChinese/check-commit-msg.js` on `commit-msg`.
- Formily schema rendering is centralized in `src/components/common/FormliyView/index.tsx`. If a backend schema introduces a new `x-component`, wire it into that file's `createSchemaField({ components: ... })` registry instead of bypassing Formily in page code.
- Custom Formily/Designable field implementations live under `src/components/designable/src/components/`. Reuse the existing naming pattern where a schema component name maps to a concrete field component such as `SelectTable`, `IDSelector`, `TradeLicenseDetails`, or `GuardianConsentDetails`.
- Backend-driven form steps store serialized schema plus values in `formData`. Preserve that shape when editing flow code: `FormliyView` expects JSON with `form`, `schema`, and optional `formValues`, and review flows such as `FormilyReviewList` read the same payload back for read-only rendering.
- Prefer extending existing Designable widgets and setters before inventing parallel components. This repo already has many domain-specific building blocks in `src/components/designable/src/components/`, including custom setters and composite fields for media-license workflows.
- When a Formily step needs to notify the page shell, use the existing `FormliyView` callback surface (`setFormInstance`, `onValuesChange`, `onUploadComplete`, `onTotalFeeChange`, `onSelectTableOptionsChange`, `onTotalFeeFloat`) so page-level state stays synchronized with the rendered schema.
