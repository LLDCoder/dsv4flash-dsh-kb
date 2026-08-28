import { useLayoutEffect, useRef, useState } from "react";

/**
 * Returns a ref to attach to a filter/toolbar row and a boolean that is true
 * when the row is too narrow to show all filters inline.
 *
 * Attach the ref to the flex row whose children must all fit on one line
 * (including any CTA sharing the row). The row must be block-level so its
 * clientWidth reflects the available space regardless of its content.
 *
 * The required width is measured from the DOM: the sum of the children's
 * natural widths plus flex gaps. For each child the larger of its border-box
 * width and its scrollWidth is used, so a nested flex group that clips its
 * own overflowing content still reports what it actually needs.
 *
 * For the measurement to mean anything, full-layout items must not shrink
 * below their design minimum: give fixed-width items flex-shrink: 0 and
 * flexible items a min-width floor — a freely shrinking item measures as
 * "fitting" at any width. Rules that relax those floors for the compact
 * layout must be scoped to a compact-state class so they never apply while
 * the full layout is being measured.
 */
export default function useFilterOverflow() {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const isOverflowingRef = useRef(false);
  const measuredWidthRef = useRef(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measureRequiredWidth = () => {
      const children = Array.from(el.children) as HTMLElement[];
      const gap = parseFloat(window.getComputedStyle(el).columnGap) || 0;
      // Items that fill the row (flex: 1) measure exactly as wide as the
      // space they were given, so use fractional rect widths and only fall
      // back to the integer scrollWidth when a child genuinely clips its
      // content — rounding up here would read a perfect fit as overflow.
      const childrenWidth = children.reduce((total, child) => {
        const rectWidth = child.getBoundingClientRect().width;
        const clipsContent = child.scrollWidth > child.clientWidth;
        return (
          total + (clipsContent ? Math.max(rectWidth, child.scrollWidth) : rectWidth)
        );
      }, 0);
      return childrenWidth + gap * Math.max(children.length - 1, 0);
    };

    const check = () => {
      const style = window.getComputedStyle(el);
      const paddingH =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const borderH =
        parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      const available = el.getBoundingClientRect().width - paddingH - borderH;

      // Only re-measure while the full layout is mounted; while the compact
      // layout is shown, keep the last full-layout measurement — measuring
      // the (smaller) compact layout would immediately toggle back.
      if (!isOverflowingRef.current) {
        measuredWidthRef.current = measureRequiredWidth();
      }

      // 1px tolerance: sub-pixel layout and integer DOM metrics make a row
      // that exactly fits measure a hair over its container.
      isOverflowingRef.current = measuredWidthRef.current - available > 1;
      setIsOverflowing(isOverflowingRef.current);
    };

    const observer = new ResizeObserver(check);
    observerRef.current = observer;
    observer.observe(el);
    check();

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);

  // The row is block-level, so content changes (e.g. a locale switch making
  // labels wider) don't resize it — observe the children too, re-attaching
  // after every layout swap since React replaces the nodes. observe() is
  // idempotent and removed nodes are dropped automatically.
  useLayoutEffect(() => {
    const el = ref.current;
    const observer = observerRef.current;
    if (!el || !observer) return;

    Array.from(el.children).forEach((child) => observer.observe(child));
  }, [isOverflowing]);

  return [ref, isOverflowing] as const;
}
