export type KeepAliveAsyncGuard = {
  capture: () => number;
  invalidate: () => void;
  isCurrent: (candidate: number) => boolean;
};

export function createKeepAliveAsyncGuard(): KeepAliveAsyncGuard;
