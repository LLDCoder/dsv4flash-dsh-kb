import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Tooltip } from "antd";

type TooltipProps = React.ComponentProps<typeof Tooltip>;

interface OverflowTooltipProps {
  align?: TooltipProps["align"];
  as?: "div" | "h2" | "h3" | "p";
  className?: string;
  children: React.ReactNode;
  focusableWhenOverflowing?: boolean;
  overlayClassName?: TooltipProps["overlayClassName"];
  title: React.ReactNode;
  placement?: TooltipProps["placement"];
  trigger?: TooltipProps["trigger"];
}

const OverflowTooltip: React.FC<OverflowTooltipProps> = ({
  align,
  as: Component = "div",
  className,
  children,
  focusableWhenOverflowing = false,
  overlayClassName,
  title,
  placement = "top",
  trigger,
}) => {
  const contentRef = useRef<HTMLElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const setContentRef = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
  }, []);

  const measureOverflow = useCallback(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    setIsOverflowing(
      content.scrollHeight > content.clientHeight ||
        content.scrollWidth > content.clientWidth,
    );
  }, []);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(measureOverflow);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [children, measureOverflow, title]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return undefined;
    }

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureOverflow);

      return () => {
        window.removeEventListener("resize", measureOverflow);
      };
    }

    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [measureOverflow]);

  useEffect(() => {
    if (!("fonts" in document)) {
      return undefined;
    }

    let isMounted = true;
    void document.fonts.ready.then(() => {
      if (isMounted) {
        measureOverflow();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [measureOverflow]);

  const tooltipTitle =
    isOverflowing && title !== null && title !== undefined && title !== ""
      ? title
      : undefined;

  return (
    <Tooltip
      align={align}
      overlayClassName={overlayClassName}
      placement={placement}
      title={tooltipTitle}
      trigger={trigger}
    >
      <Component
        ref={setContentRef}
        className={className}
        tabIndex={focusableWhenOverflowing && isOverflowing ? 0 : undefined}
      >
        {children}
      </Component>
    </Tooltip>
  );
};

export default OverflowTooltip;
