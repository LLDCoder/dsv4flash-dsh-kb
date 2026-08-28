import React from "react";
import "./index.less";

interface HighlightKeywordProps {
  text: string;
  keyword: string;
  highlightClass?: string;
}

const HighlightKeyword: React.FC<HighlightKeywordProps> = ({
  text,
  keyword,
  highlightClass = "highlight",
}) => {
  if (!text.trim() || !keyword.trim()) {
    return <span>{text}</span>;
  }

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(`(${escapedKeyword})`, "gi");

 const highlightedParts = text.split(regex).map((part, index, array) => {
    if (part.toLowerCase() === keyword.toLowerCase()) {
      // Check if the match is at word boundaries
      const prevPart = index > 0 ? array[index - 1] : "";
      const nextPart = index < array.length - 1 ? array[index + 1] : "";
      
      // Check if previous character is a word character (letter, digit, underscore)
      const hasWordCharBefore = prevPart.length > 0 && /\w/.test(prevPart[prevPart.length - 1]);
      // Check if next character is a word character
      const hasWordCharAfter = nextPart.length > 0 && /\w/.test(nextPart[0]);
      
      // Only add space if not in the middle of a word
      const prefix = (index === 0 || hasWordCharBefore) ? "" : "\u00A0";
      const suffix = (index === array.length - 1 || hasWordCharAfter) ? "" : "\u00A0";
      
      return (
        <span key={index}>
          {prefix}
          <span className={highlightClass} data-keyword={keyword}>{part}</span>
          {suffix}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });

  return <>{highlightedParts}</>;
};

export default HighlightKeyword;
