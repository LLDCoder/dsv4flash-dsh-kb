export function createKeepAliveAsyncGuard() {
  let version = 0;

  return {
    capture: () => version,
    invalidate: () => {
      version += 1;
    },
    isCurrent: (candidate) => candidate === version,
  };
}
