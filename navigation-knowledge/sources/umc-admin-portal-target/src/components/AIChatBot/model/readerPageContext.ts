export interface ReaderPageContext {
  route: string;
  query: Record<string, string>;
  view: string;
  selectedRecordKeys: string[];
  browserTimezone: string;
  filters: Array<{ name: string; value: string }>;
  visibleRecords: Array<{ collection: string; key: string; label: string }>;
  capturedAt: string;
}

// Record identifiers in a question are a navigation constraint, not business
// data. Keeping the extraction generic lets the reader honor any portal key
// without embedding a task number or module-specific value in the chatbot.
export function requestedRecordKeys(question: string): string[] {
  const matches = question.match(/\b[A-Z]{2,8}-\d{4}-[A-Z0-9][A-Z0-9_-]{2,120}\b/gi) || [];
  return Array.from(new Set(matches.map((value) => value.trim().toUpperCase()))).slice(0, 20);
}

// The portal reader may return a bounded table when an exact task is named.
// Keep the chatbot presentation bounded to that same named row without
// translating or inventing any field values. This only applies when the
// response visibly contains multiple task sections.
export function filterExplicitTaskList(content: string, question: string): string {
  const requested = requestedRecordKeys(question);
  if (requested.length !== 1 || !content) return content;
  const sections = content.split(/(?=^\s*(?:\d+[.)]\s*)?(?:Task\s+No|رقم\s+المهمة)\s*[:：])/gim);
  if (sections.length < 3) return content;
  const matching = sections.filter((section) => requested.some((key) => {
    const identity = section.match(/\b[A-Z]{2,8}-\d{4}-[A-Z0-9][A-Z0-9_-]{2,120}\b/i)?.[0];
    return identity?.toUpperCase() === key;
  }));
  if (matching.length !== 1) return content;
  const intro = sections[0]
    .replace(/(?:These are some matching records, not the full list\.?|هذه بعض السجلات المطابقة، وليست القائمة الكاملة\.?)/gi, "")
    .trim();
  const trailingSection = sections.slice(1).find((section) => /Current selected view:|Read from |العرض المحدد حاليًا:|تمت القراءة من/i.test(section));
  const trailingStart = trailingSection?.search(/(?:Current selected view:|Read from |العرض المحدد حاليًا:|تمت القراءة من)/i) ?? -1;
  const trailing = trailingSection && trailingStart >= 0 ? trailingSection.slice(trailingStart) : "";
  return [intro, matching[0].trim(), trailing.trim()].filter(Boolean).join("\n\n");
}

// Browser state is a navigation hint. The server verifies catalog membership,
// permissions and live records; no page text or business values are scraped.
export function captureReaderPageContext(
  location: Pick<Location, "pathname" | "search">,
  root: ParentNode,
  browserTimezone: string,
  question = "",
): ReaderPageContext {
  const query: Record<string, string> = {};
  new URLSearchParams(location.search).forEach((value, key) => {
    if (Object.keys(query).length < 30 && key.length <= 100 && value.length <= 500
        && !/token|password|secret|cookie|authorization|email|phone|passport/i.test(key)) {
      query[key] = value;
    }
  });
  const visible = (node: Element) => node.getClientRects().length > 0;
  const tabs = Array.from(root.querySelectorAll('[role="tab"][aria-selected="true"]')).filter(visible);
  const keys = Array.from(root.querySelectorAll(
    '[data-row-key][aria-selected="true"], [data-row-key]:has(input[type="checkbox"]:checked)',
  )).filter(visible).map((node) => node.getAttribute("data-row-key") || "");
  // Page components explicitly publish applied filter state. Never scrape
  // arbitrary form values or treat draft/unsubmitted controls as active filters.
  const filters = Array.from(root.querySelectorAll("[data-reader-filter-name][data-reader-filter-value]"))
    .filter(visible).map((node) => ({
      name: node.getAttribute("data-reader-filter-name") || "",
      value: node.getAttribute("data-reader-filter-value") || "",
    })).filter(({ name, value }) => name.length > 0 && name.length <= 100 && value.length <= 500
      && !/token|password|secret|cookie|authorization|email|phone|passport/i.test(name)).slice(0, 20);
  const visibleRecords = Array.from(root.querySelectorAll(
    "[data-reader-record-collection][data-reader-record-key][data-reader-record-label]",
  )).filter(visible).map((node) => ({
    collection: node.getAttribute("data-reader-record-collection") || "",
    key: node.getAttribute("data-reader-record-key") || "",
    label: node.getAttribute("data-reader-record-label") || "",
  })).filter(({ collection, key, label }) => collection.length > 0 && collection.length <= 100
    && key.length > 0 && key.length <= 300 && label.length > 0 && label.length <= 300
    && !/token|password|secret|cookie|authorization|email|phone|passport/i.test(label)).slice(0, 50);
  const requestedKeys = requestedRecordKeys(question);
  const constrainedRecords = requestedKeys.length > 0
    ? visibleRecords.filter(({ key, label }) => requestedKeys.some((requestedKey) =>
      key.trim().toUpperCase() === requestedKey || label.toUpperCase().includes(requestedKey)))
    : visibleRecords;
  return {
    route: location.pathname,
    query,
    // A page may publish a locale-independent view key; the server still
    // verifies it against documented views and the freshly observed tab.
    view: tabs.length === 1 ? (tabs[0].getAttribute("data-reader-view")
      || tabs[0].querySelector("[data-reader-view]")?.getAttribute("data-reader-view")
      || tabs[0].textContent || "").trim().slice(0, 300) : "",
    selectedRecordKeys: Array.from(new Set(keys.filter((key) => key && key.length <= 300))).slice(0, 20),
    browserTimezone,
    filters,
    // When the user names a record that is visible on the page, expose only
    // that record as the bounded page population. If it is not visible, keep
    // the complete observed page so the server can report that limitation.
    visibleRecords: constrainedRecords.length > 0 ? constrainedRecords : visibleRecords,
    capturedAt: new Date().toISOString(),
  };
}
