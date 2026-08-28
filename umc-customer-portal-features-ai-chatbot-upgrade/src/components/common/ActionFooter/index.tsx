import React, {
  type CSSProperties,
  type ReactNode,
  useRef,
  useLayoutEffect,
  useState,
} from "react";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Popover } from "antd";
import CustomButton from "../CustomButton";
import useMediaQuery from "@/hooks/useMediaQuery";
import "./index.less";

interface ActionFooterProps {
  actions?: ReactNode;
  overflowActions?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  backText?: string;
  className?: string;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({
  actions,
  overflowActions,
  showBack = true,
  onBack,
  backText,
  className = "",
}) => {
  const history = useHistory();
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const resolvedBackText = backText ?? t("actionFooter.back");
  const rightRef = useRef<HTMLDivElement>(null);
  const actionFooterRef = useRef<HTMLDivElement>(null);
  const [multiButton, setMultiButton] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [footerOffset, setFooterOffset] = useState(0);

  useLayoutEffect(() => {
    if (!isMobile || !rightRef.current) return;
    const count = rightRef.current.querySelectorAll(".ant-btn").length;
    setMultiButton(count > 2);
  }, [isMobile, actions, showBack]);

  useLayoutEffect(() => {
    const footer = document.querySelector<HTMLElement>(".footer");
    const layout = document.querySelector<HTMLElement>(
      ".layout-scroll .layout",
    );
    const scrollWrapper = document.querySelector<HTMLElement>(
      ".layout-scroll .simplebar-content-wrapper",
    );

    if (!footer || !layout || !scrollWrapper) return;

    const updateFooterOffset = () => {
      const footerRect = footer.getBoundingClientRect();
      const scrollRect = scrollWrapper.getBoundingClientRect();
      const visibleFooterHeight = Math.max(
        0,
        Math.min(footerRect.bottom, scrollRect.bottom) -
          Math.max(footerRect.top, scrollRect.top),
      );

      setFooterOffset((currentOffset) =>
        Math.abs(currentOffset - visibleFooterHeight) < 0.5
          ? currentOffset
          : visibleFooterHeight,
      );
    };

    updateFooterOffset();
    scrollWrapper.addEventListener("scroll", updateFooterOffset, {
      passive: true,
    });
    window.addEventListener("resize", updateFooterOffset);
    const resizeObserver = new ResizeObserver(updateFooterOffset);
    resizeObserver.observe(footer);
    resizeObserver.observe(layout);

    return () => {
      scrollWrapper.removeEventListener("scroll", updateFooterOffset);
      window.removeEventListener("resize", updateFooterOffset);
      resizeObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const actionFooter = actionFooterRef.current;
    const layoutContent = actionFooter?.closest<HTMLElement>(".layout-content");
    if (!actionFooter || !layoutContent) return;

    const previousHeight = layoutContent.style.getPropertyValue(
      "--action-footer-height",
    );
    const hadLayoutClass = layoutContent.classList.contains(
      "layout-content--with-action-footer",
    );

    const updateActionFooterHeight = () => {
      const nextHeight = actionFooter.getBoundingClientRect().height;
      layoutContent.style.setProperty(
        "--action-footer-height",
        `${nextHeight}px`,
      );
    };

    layoutContent.classList.add("layout-content--with-action-footer");
    updateActionFooterHeight();
    const resizeObserver = new ResizeObserver(updateActionFooterHeight);
    resizeObserver.observe(actionFooter);

    return () => {
      resizeObserver.disconnect();
      if (previousHeight) {
        layoutContent.style.setProperty(
          "--action-footer-height",
          previousHeight,
        );
      } else {
        layoutContent.style.removeProperty("--action-footer-height");
      }
      if (!hadLayoutClass) {
        layoutContent.classList.remove("layout-content--with-action-footer");
      }
    };
  }, []);

  const footerOffsetStyle = {
    "--action-footer-offset": `${footerOffset}px`,
  } as CSSProperties;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      history.goBack();
    }
  };

  if (isMobile) {
    const showOverflowBtn = Boolean(overflowActions);

    return (
      <div
        ref={actionFooterRef}
        className={`action-footer ${className}`}
        style={footerOffsetStyle}
      >
        <div className="action-footer-content">
          <div
            ref={rightRef}
            className={`action-footer-right${multiButton ? " action-footer-right--multi" : ""}`}
          >
            {showBack && (
              <CustomButton variant="outline" onClick={handleBack}>
                {resolvedBackText}
              </CustomButton>
            )}
            {actions}
            {showOverflowBtn && (
              // Explicit wrapper gives Ant Design's Popover a known flex size
              // so the trigger button never wraps to the next row.
              <span className="action-footer-overflow-wrapper">
                <Popover
                  open={overflowOpen}
                  onOpenChange={setOverflowOpen}
                  trigger="click"
                  placement="topRight"
                  content={
                    <div
                      className="action-footer-overflow-popup"
                      onClick={() => setOverflowOpen(false)}
                    >
                      {overflowActions}
                    </div>
                  }
                  overlayClassName="action-footer-overflow-popover"
                >
                  <button className="action-footer-overflow-trigger">
                    <span />
                    <span />
                    <span />
                  </button>
                </Popover>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div
      ref={actionFooterRef}
      className={`action-footer ${className}`}
      style={footerOffsetStyle}
    >
      <div className="action-footer-content">
        {showBack && (
          <div className="action-footer-left">
            <CustomButton variant="outline" onClick={handleBack}>
              {resolvedBackText}
            </CustomButton>
          </div>
        )}
        {(actions || overflowActions) && (
          <div className="action-footer-right">
            {overflowActions}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionFooter;
