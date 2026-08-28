import { CloseOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import aiChatbotRobot from "@/assets/images/ai-chatbot-avatar.png";
import { useUserStore } from "@/store/user";
import { ChatBotContent } from "./ChatBotContent";
import { openAiChatBotEvent } from "./featureFlag";
import "./index.less";

export default function AIChatBot() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const customerToken = useUserStore((state) => state.userInfo.token);
  const userId = useUserStore((state) => state.userInfo.id);
  const authenticated = Boolean(customerToken && userId);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        setExpanded(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    const openChatBot = () => setOpen(true);
    window.addEventListener(openAiChatBotEvent, openChatBot);
    return () => window.removeEventListener(openAiChatBotEvent, openChatBot);
  }, []);

  const close = () => {
    setExpanded(false);
    setOpen(false);
  };

  return (
    <div className="ai-chatbot__widget">
      {open ? (
        <section
          id="nma-ai-chatbot-panel"
          aria-label={t("aiChatBot.panelLabel")}
          aria-modal="false"
          className={`ai-chatbot__panel ${expanded ? "ai-chatbot__panel-expanded" : ""}`}
          role="dialog"
        >
          {authenticated ? (
            <ChatBotContent
              expanded={expanded}
              onClose={close}
              onExpandedChange={setExpanded}
            />
          ) : (
            <div className="ai-chatbot__auth-state" role="alert">
              <button
                aria-label={t("aiChatBot.close")}
                className="ai-chatbot__login-close"
                title={t("aiChatBot.close")}
                type="button"
                onClick={close}
              >
                <CloseOutlined />
              </button>
              <strong>{t("aiChatBot.validationError")}</strong>
            </div>
          )}
        </section>
      ) : null}
      {!expanded ? (
        <button
          aria-controls="nma-ai-chatbot-panel"
          aria-expanded={open}
          aria-label={t(open ? "aiChatBot.close" : "aiChatBot.open")}
          className="ai-chatbot__launcher"
          title={t(open ? "aiChatBot.close" : "aiChatBot.open")}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
        >
          <span aria-hidden="true" className="ai-chatbot__robot-badge">
            <span className="ai-chatbot__robot-crop">
              <img alt="" draggable="false" src={aiChatbotRobot} />
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );
}
