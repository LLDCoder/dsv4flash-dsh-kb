type ScrollContainer = Pick<HTMLElement, "scrollTop">;

export function getLayoutScrollContainer(): HTMLElement | null;
export function saveScrollPosition(container: ScrollContainer | null): number;
export function restoreScrollPosition(
  container: ScrollContainer | null,
  position: number,
): void;
