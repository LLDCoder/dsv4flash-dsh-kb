const LAYOUT_SCROLL_CONTAINER_SELECTOR =
  ".layout-scroll .simplebar-content-wrapper";

export function getLayoutScrollContainer() {
  if (typeof document === "undefined") {
    return null;
  }

  return document.querySelector(LAYOUT_SCROLL_CONTAINER_SELECTOR);
}

export function saveScrollPosition(container) {
  return typeof container?.scrollTop === "number" ? container.scrollTop : 0;
}

export function restoreScrollPosition(container, position) {
  if (!container || !Number.isFinite(position)) {
    return;
  }

  container.scrollTop = position;
}
