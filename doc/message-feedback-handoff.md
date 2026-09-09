# AI reply feedback implementation

## Admin implementation

- A completed `assistant.message` is identified by its persisted DSH event sequence.
- The Admin Portal renders copy, thumbs-up, and thumbs-down controls below that reply.
- Selecting the active control again clears the vote; selecting the other control switches it.
- `PUT /api/v1/conversations/{conversationId}/messages/{assistantEventSeq}/feedback`
  validates conversation ownership and that the target event is an assistant reply.
- `message_feedback` stores one current vote per assistant reply together with tenant and user ownership.
- Conversation history includes the current vote in the assistant event data so selection survives reload.

The icons are repository copies of `/Users/thron/Downloads/thumbUp.svg` and
`/Users/thron/Downloads/thumbDown.svg`.

## Customer Portal follow-up

Reuse the same DSH endpoint and message identity contract. Port these frontend concerns:

1. Add `eventSeq` and `feedback` to the Customer Portal chat message type.
2. Preserve `assistant.message` event sequence for both live and history messages.
3. Add `setDshMessageFeedback` to the Customer DSH client.
4. Render the same two SVG controls only for completed, persisted assistant messages.
5. Update local message state from the endpoint result and include localized saved/failed notices.

No second database table or Customer-specific feedback endpoint is needed; tenant/user ownership
already separates portal users.
