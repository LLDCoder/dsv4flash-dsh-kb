import { useMemo } from "react";

export function useDeviceType() {
  const deviceType = useMemo(() => {
    if (typeof window === 'undefined') return 'pc';
    const ua = navigator.userAgent || '';
    const isIpad = /iPad|Macintosh/.test(ua) && 'ontouchend' in document;
    const isTablet = /Tablet|Pad|Android(?!.*Mobile)/i.test(ua) || isIpad;
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua) && !isTablet;
    return isMobile ? 1 : isTablet ? 3 : 2;
  }, []);

  return deviceType;
}