import { forwardRef, useCallback, useEffect, useRef } from "react";
import type React from "react";
import BaseSimpleBar from "simplebar-react";
import { useTranslation } from "react-i18next";
import "simplebar-react/dist/simplebar.min.css";
import "./index.less";

type BaseSimpleBarProps = React.ComponentPropsWithoutRef<typeof BaseSimpleBar>;
type BaseSimpleBarRef = React.ElementRef<typeof BaseSimpleBar>;

const VISIBLE_ANTD_POPUP_SELECTOR = [
  ".ant-select-dropdown:not(.ant-select-dropdown-hidden)",
  ".ant-picker-dropdown:not(.ant-picker-dropdown-hidden):not(.ant-picker-dropdown-range-hidden)",
  ".ant-dropdown:not(.ant-dropdown-hidden)",
  ".ant-tooltip:not(.ant-tooltip-hidden)",
  ".ant-popover:not(.ant-popover-hidden)",
].join(",");

const hasVisibleDetachedPopup = (scrollableNode: HTMLElement) =>
  Array.from(
    document.querySelectorAll<HTMLElement>(VISIBLE_ANTD_POPUP_SELECTOR),
  ).some((popup) => !scrollableNode.contains(popup));

export type SimpleBarProps = BaseSimpleBarProps;

const SimpleBar = forwardRef<BaseSimpleBarRef, SimpleBarProps>(
  ({ className = "", scrollableNodeProps, ...props }, ref) => {
    const { t } = useTranslation();
    const popupAlignFrameRef = useRef<number | null>(null);
    const scrollableNodeOnScroll = scrollableNodeProps?.onScroll;
    const mergedClassName = ["custom-simplebar", className]
      .filter(Boolean)
      .join(" ");

    const handleScroll = useCallback(
      (event: React.UIEvent<HTMLElement>) => {
        scrollableNodeOnScroll?.(event);
        const scrollableNode = event.currentTarget;

        if (
          popupAlignFrameRef.current !== null ||
          !hasVisibleDetachedPopup(scrollableNode)
        ) {
          return;
        }

        popupAlignFrameRef.current = window.requestAnimationFrame(() => {
          popupAlignFrameRef.current = null;

          if (hasVisibleDetachedPopup(scrollableNode)) {
            window.dispatchEvent(new Event("resize"));
          }
        });
      },
      [scrollableNodeOnScroll],
    );

    useEffect(
      () => () => {
        if (popupAlignFrameRef.current !== null) {
          window.cancelAnimationFrame(popupAlignFrameRef.current);
          popupAlignFrameRef.current = null;
        }
      },
      [],
    );

    return (
      <BaseSimpleBar
        ref={ref}
        className={mergedClassName}
        ariaLabel={t("common.scrollableContent")}
        {...props}
        scrollableNodeProps={{
          ...scrollableNodeProps,
          onScroll: handleScroll,
        }}
      />
    );
  }
);

SimpleBar.displayName = "SimpleBar";

export default SimpleBar;
