import type { ReactNode } from "react";

// Isolate logical Latin/numeric runs from surrounding RTL prose. This preserves
// signs, decimal separators, dates and identifiers without changing copied text.
const LTR_RUN = /(?:[+\u2212-]|\p{Sc})?[\p{Script=Latin}\p{Nd}](?:[\p{Script=Latin}\p{Nd}\p{Sc} ,.:/_()+\u2212%\u066A-\u066C-]*[\p{Script=Latin}\p{Nd}\p{Sc}%\u066A)])?/gu;
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u;

export function containsArabic(value: string): boolean {
  return ARABIC.test(value);
}

export function renderBidiText(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let offset = 0;
  for (const match of value.matchAll(LTR_RUN)) {
    const index = match.index ?? 0;
    if (index > offset) nodes.push(value.slice(offset, index));
    nodes.push(
      <bdi
        className="ai-chatbot__bidi-ltr"
        dir="ltr"
        key={`${keyPrefix}-ltr-${index}`}
      >
        {match[0]}
      </bdi>,
    );
    offset = index + match[0].length;
  }
  if (offset < value.length) nodes.push(value.slice(offset));
  return nodes;
}
