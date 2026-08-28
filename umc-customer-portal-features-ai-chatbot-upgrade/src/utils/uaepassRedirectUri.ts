/**
 * Parse `redirect_uri` from UAE PASS authorize URL (VITE_UAE_PASS_* env).
 * Returns scheme + origin + pathname only — drops query/hash and any trailing `&...`
 * mistakenly bundled in the raw param value.
 */
export function getUaepassRedirectUriBaseFromAuthorizeUrl(
  authorizeUrl: string | undefined | null,
): string | undefined {
  const raw = typeof authorizeUrl === 'string' ? authorizeUrl.trim() : '';
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const param = u.searchParams.get('redirect_uri');
    if (!param) return undefined;
    let decoded = param;
    try {
      decoded = decodeURIComponent(param);
    } catch {
      /* keep encoded */
    }
    const head = decoded.split('&')[0]?.trim();
    if (!head) return undefined;
    try {
      const redirect = new URL(head);
      const pathname = redirect.pathname;
      return pathname === '/' ? redirect.origin : `${redirect.origin}${pathname}`;
    } catch {
      const noQuery = head.split('?')[0];
      return noQuery || undefined;
    }
  } catch {
    return undefined;
  }
}
