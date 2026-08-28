# Training Confirmation

Standalone anonymous landing page for service 8008 training confirmation.

- Public route: `/training-confirmation/:token`
- HTML entry: `/training-confirmation.html`
- Production hosting must rewrite `/training-confirmation/*` to that HTML entry.
- The token is the only credential and must not be stored or sent as a Portal bearer token.
- Viewers may replay watched sections, but forward seeking beyond the furthest watched position is blocked.
- Video playback pauses when the document becomes hidden and does not resume automatically.
- Download, remote playback, and picture-in-picture controls are disabled; playback speed remains available.

## Local development

Real dev API mode is the default:

```bash
npm run dev:daypop
```

Training confirmation mock routes are available only when
`VITE_ENABLE_TRAINING_CONFIRMATION_MOCK=true`. Use the dedicated command:

```bash
npm run dev:daypop:training-mock
```

Then run the deterministic browser checks in another terminal:

```bash
npm run test:training-confirmation
```

## Confirmed API fields

The dev GET and POST responses include `recipientEmail`. The Email information row uses that field directly and does not derive it from Portal state or another response field. `recipientName` may be `null`; the page leaves the value empty instead of rendering a fabricated fallback.
