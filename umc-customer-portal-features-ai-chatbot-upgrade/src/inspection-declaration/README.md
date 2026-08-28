# Inspection Declaration

This folder owns the standalone inspection declaration HTML entry and route.
It is intentionally kept outside the normal portal entry, layout, auth boundary, and page/service folders so the portal can be maintained as a pluggable mini-app.

## Runtime Entry

- Root HTML shell: `/inspection-declaration.html`
- Public route: `/inspection-declaration`
- React entry: `src/inspection-declaration/main.tsx`
- Page component: `src/inspection-declaration/index.tsx`
- Local styles: `src/inspection-declaration/index.less`
- API wrapper: `src/inspection-declaration/service.ts`

The Vite development server internally rewrites the public route to the standalone HTML entry. Production hosting must apply the same rewrite and must not fall back to the Customer Portal `index.html`.

## URL Contract

The page reads a `token` query parameter:

```text
/inspection-declaration?token=12345
```

The page starts in a loading state and calls:

```text
GET /api/inspection/signature/context?token=<token>
```

The route renders loading, form, submitted, and link-expired states without changing the URL. There are only two entry states: a `200` context renders the form, and any failure — missing token, invalid, expired, already-used, request error, bad shape — renders the link-expired state. The submitted state is reached only after `POST /api/inspection/signature/submit` succeeds in the current session; reloading afterwards shows link-expired because the token has been consumed.

## Form Fields

The form has two file uploads, both PDF-only and max 5 MB:

| Field | Submit payload |
| --- | --- |
| `Emirates ID Attachment` | `emiratesIdAttachmentFileName` / `emiratesIdAttachmentFileUrl` (pending backend support) |
| `Upload Signed File` | `signatureImageFileName` / `signatureImageFileUrl` **and** `declarationDocumentFileName` / `declarationDocumentFileUrl` |

There is no handwriting canvas. The user downloads the declaration PDF from the `Download File` row, signs it offline, and uploads the signed copy — that file *is* the signature, so it fills both required file pairs.

## Backend Integration

When the real backend is ready, replace the endpoint mapping and response contract in `service.ts`.
Keep the page component reading explicit fields from `DeclarationPortalContext`; do not add fallback fields in the UI.

Two items are still pending on the backend side, both tracked in `API.md`: the Emirates ID attachment fields on submit/context, and anonymous access to `/api/Document/Upload`.

In development, `service.ts` forces these declaration requests to the current Vite origin so the local mock can be used even when `.env.development` points `VITE_API_BASE_URL` to another host. Production builds keep the normal request base URL behavior.

## Assets

All visual assets used by the standalone page are stored in `assets/` with semantic filenames. They are sourced from the Figma node used for this module and should remain local to this folder unless another module starts sharing the same standalone design contract.
