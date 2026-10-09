import assert from "node:assert/strict";
import test from "node:test";
import { requestDshStreamCancel, isDshTurnTerminal } from "../src/components/AIChatBot/model/dshStreamControl.ts";

test("Stop sends a server cancellation without closing the subscription", () => {
  const sent = [];
  const socket = { readyState: 1, send: (data) => sent.push(JSON.parse(data)), close: () => assert.fail("closed too soon") };
  assert.equal(requestDshStreamCancel(socket, "owned-conversation"), true);
  assert.deepEqual(sent, [{ type: "cancel", conversationId: "owned-conversation" }]);
});
test("Missing or closed transports cannot send cancellation", () => {
  assert.equal(requestDshStreamCancel(undefined, "conversation"), false);
  assert.equal(requestDshStreamCancel({ readyState: 3, send: () => assert.fail() }, "conversation"), false);
  assert.equal(requestDshStreamCancel({ readyState: 1, send: () => assert.fail() }), false);
});
test("Both completion and cancellation finish the correlated turn", () => {
  assert.equal(isDshTurnTerminal("turn.cancelled"), true);
  assert.equal(isDshTurnTerminal("turn.completed"), true);
  assert.equal(isDshTurnTerminal("assistant.chunk"), false);
});
