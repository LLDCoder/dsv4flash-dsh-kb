import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createDshConversation,
  deleteDshConversation,
  DshApiError,
  type DshConversation,
  type DshEvent,
  type DshIdentity,
  getDshConversationHistory,
  listDshConversations,
  makeDshSocketUrl,
} from "@/services/dshChat";
import { useUserStore } from "@/store/user";
import i18n from "@/localization/config";
import type {
  ChatAttachment,
  ChatLanguage,
  ScenarioChoice,
  ScenarioMessage,
  WorkflowInteraction,
} from "./types";

export interface DshChatController {
  activeConversationId?: string;
  completionRevision: number;
  config: { name: string } | null;
  configError: unknown;
  configLoading: boolean;
  conversations: DshConversation[];
  deletePendingId?: string;
  historyError: unknown;
  historyLoading: boolean;
  lastFailedDisplayPrompt: string;
  lastFailedAttachment?: ChatAttachment;
  lastFailedPrompt: string;
  messageError: unknown;
  messages: ScenarioMessage[];
  messagesLoading: boolean;
  streaming: boolean;
  cancelPending: () => void;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  loadConversation: (conversationId: string) => Promise<boolean>;
  refreshConversations: () => Promise<void>;
  retryConfiguration: () => Promise<void>;
  respondToInteraction: (interactionId: string, action: "confirm" | "modify" | "cancel") => Promise<void>;
  selectChoice: (messageId: string, choice: ScenarioChoice) => Promise<boolean>;
  send: (
    message: string,
    _interactionResponse?: unknown,
    displayMessage?: string,
    attachment?: ChatAttachment,
  ) => Promise<boolean>;
  startNewConversation: () => void;
  stopStreaming: () => void;
  uploadInteraction: (interaction: WorkflowInteraction, file: File) => Promise<boolean>;
}

function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `dsh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function dshIdentity(
  userId: string,
  token: string,
  profileId: string,
  establishments: Array<{ id: number; userProfileId: string }>,
): DshIdentity | null {
  if (!userId || !token) return null;
  if (profileId === "0") return { userId, token, tenantId: `umc:global:${userId}` };
  const establishment = establishments.find(
    (item) => String(item.userProfileId) === profileId,
  );
  return {
    userId,
    token,
    tenantId: establishment
      ? `umc:establishment:${establishment.id}`
      : `umc:profile:${profileId || userId}`,
  };
}

function eventMessage(event: DshEvent, conversationId: string): ScenarioMessage | null {
  const content = typeof event.data.content === "string" ? event.data.content : "";
  const rawAttachment = event.data.attachment;
  const attachment = rawAttachment && typeof rawAttachment === "object"
    ? rawAttachment as Record<string, unknown>
    : null;
  const fileRef = typeof attachment?.fileRef === "string" ? attachment.fileRef : "";
  const fileName = typeof attachment?.fileName === "string" ? attachment.fileName : "";
  const fileType = attachment?.fileType === 0 ? 0 : attachment?.fileType === 1 ? 1 : null;
  const messageAttachment = fileRef && fileName && fileType !== null
    ? {
      fileRef,
      fileName,
      fileUrl: fileRef,
      fileType,
      kind: fileType === 0 ? "pdf" as const : "image" as const,
      mimeType: typeof attachment?.mimeType === "string"
        ? attachment.mimeType
        : fileType === 0 ? "application/pdf" : "image/*",
    }
    : undefined;
  if (!content && !messageAttachment) return null;
  if (event.eventType === "user.message") {
    return { id: `${conversationId}-${event.seq}`, role: "user", text: content, attachment: messageAttachment };
  }
  if (event.eventType === "assistant.message" || event.eventType === "assistant.welcome") {
    return { id: `${conversationId}-${event.seq}`, role: "assistant", text: content };
  }
  return null;
}

function getErrorMessage(error: unknown, language: ChatLanguage) {
  if (error instanceof DshApiError && error.status === 404) {
    return String(i18n.t("aiChatBot.chat.errors.notFound", { lng: language }));
  }
  if (error instanceof DshApiError && error.kind === "network") {
    return String(i18n.t("aiChatBot.chat.errors.network", { lng: language }));
  }
  return String(i18n.t("aiChatBot.chat.errors.generic", { lng: language }));
}

export function getDshChatErrorMessage(error: unknown, language: ChatLanguage) {
  return getErrorMessage(error, language);
}

export function useDshChat(language: ChatLanguage): DshChatController {
  const userId = useUserStore((state) => state.userInfo.id);
  const token = useUserStore((state) => state.userInfo.token);
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const identityVersion = useUserStore((state) => state.identityVersion);
  const establishments = useUserStore((state) => state.userInfo.userEstablishments);
  const identity = useMemo(
    () => dshIdentity(userId, token, String(currentProfileId || ""), establishments),
    [currentProfileId, establishments, token, userId],
  );
  const identityKey = `${identityVersion}:${identity?.userId || ""}:${identity?.tenantId || ""}`;
  const [conversations, setConversations] = useState<DshConversation[]>([]);
  const [messages, setMessages] = useState<ScenarioMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);
  const [messageError, setMessageError] = useState<unknown>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState("");
  const [lastFailedDisplayPrompt, setLastFailedDisplayPrompt] = useState("");
  const [lastFailedAttachment, setLastFailedAttachment] = useState<ChatAttachment>();
  const [deletePendingId, setDeletePendingId] = useState<string>();
  const [completionRevision, setCompletionRevision] = useState(0);
  const socketRef = useRef<WebSocket>();
  const mountedRef = useRef(true);

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = undefined;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
  }, []);

  const stopStreaming = useCallback(() => {
    closeSocket();
    setStreaming(false);
    setMessages((current) => current.flatMap((message) => (
      message.status !== "streaming"
        ? [message]
        : message.text ? [{ ...message, status: undefined }] : []
    )));
  }, [closeSocket]);

  const cancelPending = useCallback(() => {
    stopStreaming();
    setMessagesLoading(false);
  }, [stopStreaming]);

  const refreshConversations = useCallback(async () => {
    if (!identity) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const items = await listDshConversations(identity);
      if (mountedRef.current) setConversations(items);
    } catch (error) {
      if (mountedRef.current) setHistoryError(error);
    } finally {
      if (mountedRef.current) setHistoryLoading(false);
    }
  }, [identity]);

  const startNewConversation = useCallback(() => {
    cancelPending();
    setActiveConversationId(undefined);
    setMessages([]);
    setMessageError(null);
    setLastFailedPrompt("");
    setLastFailedDisplayPrompt("");
    setLastFailedAttachment(undefined);
  }, [cancelPending]);

  const loadConversation = useCallback(async (conversationId: string) => {
    if (!identity) return false;
    cancelPending();
    setMessagesLoading(true);
    setMessageError(null);
    try {
      const events = await getDshConversationHistory(identity, conversationId);
      const history: ScenarioMessage[] = [];
      for (const event of events) {
        const message = eventMessage(event, conversationId);
        if (message) history.push(message);
      }
      if (!mountedRef.current) return false;
      setActiveConversationId(conversationId);
      setMessages(history);
      return true;
    } catch (error) {
      if (mountedRef.current) setHistoryError(error);
      return false;
    } finally {
      if (mountedRef.current) setMessagesLoading(false);
    }
  }, [cancelPending, identity]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!identity) return false;
    setDeletePendingId(conversationId);
    try {
      await deleteDshConversation(identity, conversationId);
      if (activeConversationId === conversationId) startNewConversation();
      await refreshConversations();
      return true;
    } catch (error) {
      if (mountedRef.current) setHistoryError(error);
      return false;
    } finally {
      if (mountedRef.current) setDeletePendingId(undefined);
    }
  }, [activeConversationId, identity, refreshConversations, startNewConversation]);

  const send = useCallback(async (
    value: string,
    _interactionResponse?: unknown,
    displayValue?: string,
    attachment?: ChatAttachment,
  ) => {
    const prompt = value.trim();
    if (!identity || (!prompt && !attachment) || socketRef.current) return false;
    const displayPrompt = displayValue === undefined ? prompt : displayValue.trim();
    const clientMessageId = createClientMessageId();
    const assistantId = `assistant-${clientMessageId}`;
    setMessageError(null);
    setLastFailedPrompt("");
    setLastFailedDisplayPrompt("");
    setLastFailedAttachment(undefined);
    setStreaming(true);
    setMessages((current) => [
      ...current,
      ...(displayPrompt || attachment
        ? [{ id: `user-${clientMessageId}`, role: "user" as const, text: displayPrompt, attachment }]
        : []),
      { id: assistantId, role: "assistant" as const, status: "streaming", text: "" },
    ]);

    let conversationId = activeConversationId;
    try {
      if (!conversationId) {
        const conversation = await createDshConversation(identity);
        conversationId = conversation.conversationId;
        setActiveConversationId(conversationId);
      }
      const socket = new WebSocket(makeDshSocketUrl(identity));
      socketRef.current = socket;
      await new Promise<void>((resolve, reject) => {
        let subscribed = false;
        socket.onopen = () => socket.send(JSON.stringify({ type: "auth", umcToken: identity.token }));
        socket.onerror = () => reject(new DshApiError("network", "Unable to connect to the AI service."));
        socket.onmessage = (raw) => {
          const payload = JSON.parse(String(raw.data)) as Record<string, unknown>;
          if (payload.type === "authenticated") {
            socket.send(JSON.stringify({ type: "subscribe", conversationId, afterSeq: 0 }));
            return;
          }
          if (payload.type === "subscribed") {
            subscribed = true;
            socket.send(JSON.stringify({
              type: "message",
              conversationId,
              content: prompt,
              clientMessageId,
              ...(attachment ? {
                attachment: {
                  fileRef: attachment.fileRef,
                  fileName: attachment.fileName,
                  fileType: attachment.fileType,
                  mimeType: attachment.mimeType,
                },
              } : {}),
            }));
            resolve();
            return;
          }
          if (payload.type === "error") {
            reject(new DshApiError("protocol", "The AI service rejected the message."));
            return;
          }
          if (!subscribed || payload.type !== "event") return;
          const event = payload as unknown as DshEvent;
          if (event.eventType === "assistant.chunk") {
            const chunk = typeof event.data?.content === "string" ? event.data.content : "";
            if (chunk) setMessages((current) => current.map((message) => (
              message.id === assistantId ? { ...message, text: `${message.text}${chunk}` } : message
            )));
          }
          if (event.eventType === "assistant.message") {
            const content = typeof event.data?.content === "string" ? event.data.content : "";
            setMessages((current) => current.map((message) => (
              message.id === assistantId ? { ...message, text: content, status: undefined } : message
            )));
          }
          if (event.eventType === "turn.completed") {
            closeSocket();
            setStreaming(false);
            setCompletionRevision((revision) => revision + 1);
            void refreshConversations();
          }
        };
      });
      return true;
    } catch (error) {
      closeSocket();
      setStreaming(false);
      setMessageError(error);
      setLastFailedPrompt(prompt);
      setLastFailedDisplayPrompt(displayPrompt);
      setLastFailedAttachment(attachment);
      setMessages((current) => current.map((message) => (
        message.id === assistantId ? { ...message, status: "failed" } : message
      )));
      return false;
    }
  }, [activeConversationId, closeSocket, identity, refreshConversations]);

  useEffect(() => {
    startNewConversation();
    setConversations([]);
    if (identity) void refreshConversations();
  }, [identity, identityKey, refreshConversations, startNewConversation]);

  useEffect(() => () => {
    mountedRef.current = false;
    closeSocket();
  }, [closeSocket]);

  const unavailableInteraction = useCallback(async () => undefined, []);
  const unavailableChoice = useCallback(async () => false, []);
  const unavailableUpload = useCallback(async () => false, []);

  return {
    activeConversationId,
    completionRevision,
    config: identity ? { name: String(i18n.t("aiChatBot.chat.assistantName", { lng: language })) } : null,
    configError: identity ? null : new DshApiError("http", "Customer session is required.", 401),
    configLoading: false,
    conversations,
    deletePendingId,
    historyError,
    historyLoading,
    lastFailedDisplayPrompt,
    lastFailedAttachment,
    lastFailedPrompt,
    messageError,
    messages,
    messagesLoading,
    streaming,
    cancelPending,
    deleteConversation,
    loadConversation,
    refreshConversations,
    retryConfiguration: async () => undefined,
    respondToInteraction: unavailableInteraction,
    selectChoice: unavailableChoice,
    send,
    startNewConversation,
    stopStreaming,
    uploadInteraction: unavailableUpload,
  };
}
