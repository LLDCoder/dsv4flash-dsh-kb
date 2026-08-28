# Inspection Declaration Portal API

## Purpose

This document describes the backend contract used by the standalone
`/inspection-declaration` route. It tracks the incoming spec in
`inspection-signature-frontend-api.md` and records the two places where the page
needs more than that spec currently defines.

The page reads a `token` query parameter, loads the signature context, lets the
contact person upload the required PDF files, and submits everything in a single
call. The route is served by the separate `inspection-declaration.html` build
entry; production hosting must internally rewrite `/inspection-declaration` to
that HTML file instead of the Customer Portal `index.html`.

Example page URL:

```text
/inspection-declaration?token=12345
```

## Page States

The page has exactly **two** entry states, decided by the context call:

| Context result | Rendered state |
| --- | --- |
| `200` with a context payload | the form |
| any failure (`400` invalid / expired / already used, `500`, bad shape, missing token) | `Link Expired` |

The success screen is **not** an entry state. It is reached only after a submit
call returns `200` in the current session. Reloading the page after a successful
submit shows `Link Expired`, because the token has been consumed — no extra
submit call is made.

## Common Response Envelope

Both shapes are accepted:

```json
{ "code": 200, "message": "Success", "data": {} }
```

```json
{ "taskId": 123 }
```

A response is treated as failed when `code` / `statusCode` is `400` or higher,
`isSuccess` is `false`, or an enveloped response has no `data`. The error text is
read from `message`, falling back to `title`.

## Authentication

All three endpoints are called **anonymously**. The page has no Customer Portal
session; requests are sent with `skipAuth`, so no `Authorization` header is
attached and any existing portal token in `localStorage` is left untouched. The
opaque link token is the only credential.

`POST /api/Document/public/Upload` is the anonymous upload endpoint used by this
page. If it turns out to require a session, the backend needs a truly anonymous
variant, ideally scoped by the link token.

## GET Signature Context

```http
GET /api/inspection/signature/context?token={opaque-token}
```

### Success Response

```json
{
  "taskId": 123,
  "taskNo": "IT-2026-000123",
  "contactPersonId": 456,
  "expiresOnUtc": "2026-08-28T10:30:00Z",
  "establishmentName": "ABC Trading LLC",
  "applicantFullName": "Ahmed Ali",
  "tradeLicenseNumber": "CN-123456",
  "contactFullName": "Ahmed Ali",
  "position": "Manager",
  "mobile": "+971501234567",
  "mobileCountryCode": "+971",
  "mobileLocalNumber": "501234567",
  "email": "ahmed@example.com",
  "emiratesId": "784198800000011",
  "declarationAcknowledged": false,
  "eidAttachmentFileName": null,
  "eidAttachmentFileUrl": null
}
```

### Data Contract

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `contactFullName` | `string` | Yes | Prefills `Full Name`. |
| `position` | `string` | Yes | Prefills `Position`. |
| `mobile` | `string` | Yes | Full number, prefills the mobile input. |
| `mobileCountryCode` | `string \| null` | Yes | Falls back to the default dial code when null. |
| `mobileLocalNumber` | `string \| null` | Yes | Local part without the country code. |
| `email` | `string` | Yes | Prefills `Email Address`. |
| `emiratesId` | `string` | Yes | Digits only; the input keeps 15 digits starting with `784`. |
| `declarationAcknowledged` | `boolean` | Yes | Informational; the page always submits `true`. |
| `expiresOnUtc` | `string` | Yes | Used for expiry messaging only. |
| `taskId`, `taskNo`, `contactPersonId`, `establishmentName`, `applicantFullName`, `tradeLicenseNumber` | — | Yes | Accepted and available for display. |
| `eidAttachmentFileName` | `string \| null` | **Pending** | Prefills the Emirates ID upload chip. Not in the spec yet; treated as optional. |
| `eidAttachmentFileUrl` | `string \| null` | **Pending** | Same as above. |

The declaration template shown in the `Download File` row is currently a static
asset (`public/Declaration and Acknowledgement.pdf`, referenced through
`src/constants/inspectionDeclarationTemplate.ts`), not a context field. If the
template ever becomes task-specific, the backend should return
`templateFileName` + `templateFileUrl` and the page will switch to them.

## Upload Document

```http
POST /api/Document/public/Upload
Content-Type: multipart/form-data

files: <one PDF>
```

Response `data` must contain `fileUrl` (and may contain `fileName`,
`contentType`). The page keeps the local file name and uses the returned
`fileUrl`. `fileUrl` must be reachable by AdminPortal and must not be a
short-lived temporary address.

The form has exactly two uploads, both PDF-only, max 5 MB, one active file each:

1. `Emirates ID Attachment`
2. `Upload Signed File` — the declaration PDF the user downloaded, signed, and
   re-uploaded

## POST Submit Signature

```http
POST /api/inspection/signature/submit
Content-Type: application/json
```

```json
{
  "token": "12345",
  "fullName": "Ahmed Ali",
  "position": "Manager",
  "mobileCountryCode": "+971",
  "mobileLocalNumber": "501234567",
  "mobile": "+971501234567",
  "email": "ahmed@example.com",
  "emiratesId": "784198800000011",
  "declarationAcknowledged": true,
  "signatureImageFileName": "signed-declaration.pdf",
  "signatureImageFileUrl": "/api/Document/Dowload?fileName=signed-declaration.pdf",
  "declarationDocumentFileName": "signed-declaration.pdf",
  "declarationDocumentFileUrl": "/api/Document/Dowload?fileName=signed-declaration.pdf",
  "emiratesIdAttachmentFileName": "emirates-id.pdf",
  "emiratesIdAttachmentFileUrl": "/api/Document/Dowload?fileName=emirates-id.pdf"
}
```

### Field Mapping

| Payload field | Source |
| --- | --- |
| `token` | page URL, passed through untouched |
| `fullName`, `position`, `mobile*`, `email`, `emiratesId` | Contact Person Information |
| `declarationAcknowledged` | always `true`; the page submits only after the signed file is attached |
| `signatureImageFileName` / `signatureImageFileUrl` | `Upload Signed File` |
| `declarationDocumentFileName` / `declarationDocumentFileUrl` | `Upload Signed File` (same file) |
| `emiratesIdAttachmentFileName` / `emiratesIdAttachmentFileUrl` | `Emirates ID Attachment` — **pending backend support** |

There is no handwriting canvas. The user signs the declaration PDF offline and
uploads it, so the signed document *is* the signature: the page fills both
required file pairs from that one upload. If the backend later wants a single
pair, drop `signatureImage*` and keep `declarationDocument*`.

### Success Response

```json
{
  "taskId": 123,
  "contactPersonId": 456,
  "submittedOnUtc": "2026-08-21T10:30:00Z",
  "signatureLinkConsumedOnUtc": "2026-08-21T10:30:00Z"
}
```

The page shows the success screen on `200` and ignores the payload contents.

### Error Handling

`400` / `500` keep the user on the form and show the backend message. The submit
button is disabled while the request is in flight. Known messages:

- `Signature token is required.`
- `Full name is required.`
- `Mobile is required.`
- `Declaration must be acknowledged.`
- `Signature image is required.`
- `Declaration document is required.`
- `The signature link is invalid or has expired.`
- `Signature submission failed. The link may be invalid, expired, or already used.`

## Open Items for Backend

1. Accept `emiratesIdAttachmentFileName` / `emiratesIdAttachmentFileUrl` on
   submit, and return them in the context response so the upload can be
   prefilled. The form requires this file; today it has nowhere to go.
2. Confirm `POST /api/Document/public/Upload` is reachable anonymously.

## Frontend Integration Notes

The integration points live in `src/inspection-declaration/service.ts`. Replace
endpoint paths or response parsing there if the production API differs. Keep the
field names above stable so the UI does not need fallback mappings.

In development, `service.ts` forces these requests to the current Vite origin so
they go through the dev server proxy to the real backend. Production builds keep
the normal request base URL behavior.

The dev mock plugin that used to serve these endpoints (and a generated
`/declaration-template.pdf`) has been removed now that the page talks to the real
API. The declaration template is now a checked-in static asset:
`public/Declaration and Acknowledgement.pdf`, served from the site root, so the
`Download File` row can be previewed and downloaded without a backend call.
