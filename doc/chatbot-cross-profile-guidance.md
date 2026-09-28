# Customer AI Chatbot cross-Profile guidance contract

The Customer AI Chatbot uses the JSON WebSocket endpoint `/api/v1/ws`. When a
read-only request needs a different authorized Profile, the persisted
`assistant.message` event includes an optional `profileAction` object:

```json
{
  "type": "open_profile_menu",
  "code": "profile_switch_required",
  "targetProfile": {
    "profileId": "authorized-profile-id",
    "profileName": "Government UMC"
  }
}
```

`profile_selection_required` has no target when the user is in Global View and
has not identified one concrete Profile. `targetProfile` is display-safe and is
only emitted after the server resolves a Profile from the current account
context. The client must refresh and match it against its authorized Profile
inventory before switching.

After a successful switch, the client retries the original question and shows
the localized data-scope notice. Exact application-number lookups remain
read-only account lookups and do not require a Profile selection.

The generated OpenAPI document exposes the same contract under the
`x-websocket-events` extension at `/openapi.json`.
