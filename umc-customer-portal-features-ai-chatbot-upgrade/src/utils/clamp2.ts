export default function truncateTextToTwoLines(el: HTMLDivElement | HTMLSpanElement, moreText = '...') {
  if (!el) return;
  if (!el.dataset.originalText) {
    el.dataset.originalText = el.textContent?.trim() || '';
  }

  const originalText = el.dataset.originalText;
  el.textContent = originalText;
  el.style.overflow = 'hidden';

  if (el.scrollHeight > el.clientHeight) {
    let truncatedText = originalText;
    while (el.scrollHeight > el.clientHeight && truncatedText.length > 0) {
      truncatedText = truncatedText.slice(0, -1);
      el.textContent = truncatedText + moreText;
    }
  }
}