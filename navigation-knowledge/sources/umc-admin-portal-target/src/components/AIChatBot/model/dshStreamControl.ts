type CancelSocket = { readyState: number; send: (data: string) => void };

/** Keep the subscription alive until the server persists its terminal answer. */
export function requestDshStreamCancel(socket: CancelSocket | undefined, conversationId?: string): boolean {
  if (!socket || socket.readyState !== 1 || !conversationId) return false;
  socket.send(JSON.stringify({ type: "cancel", conversationId }));
  return true;
}

export function isDshTurnTerminal(eventType: string): boolean {
  return eventType === "turn.completed" || eventType === "turn.cancelled";
}
