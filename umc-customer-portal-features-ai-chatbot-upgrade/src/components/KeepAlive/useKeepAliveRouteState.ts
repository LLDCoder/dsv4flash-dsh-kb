import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { KeepAliveContext, KeepAliveItemContext } from "./context";

type FrozenLocation = {
  pathname: string;
  search: string;
};

type KeepAliveRouteStateOptions = {
  restorePathname: string;
  restoreFrom: string[];
  requireEmptySearch?: boolean;
  restoreStateKey?: string;
};

export default function useKeepAliveRouteState({
  restorePathname,
  restoreFrom,
  requireEmptySearch = true,
  restoreStateKey,
}: KeepAliveRouteStateOptions) {
  const location = useLocation();
  const { activeKey, prevActiveKey } = useContext(KeepAliveContext);
  const { cacheKey } = useContext(KeepAliveItemContext);
  const activated = activeKey === cacheKey;
  const [frozenLocation, setFrozenLocation] = useState<FrozenLocation>(() => ({
    pathname: location.pathname,
    search: location.search,
  }));
  const restoreState =
    location.state && typeof location.state === "object"
      ? (location.state as Record<string, unknown>)
      : null;
  const allowRestore =
    restoreStateKey === undefined ? true : restoreState?.[restoreStateKey] === true;

  // Reuse the last cached search state only for explicit "back to list" restores.
  const isRestoringRouteState =
    activated &&
    location.pathname === restorePathname &&
    (!requireEmptySearch || !location.search) &&
    restoreFrom.includes(prevActiveKey) &&
    allowRestore &&
    Boolean(frozenLocation.search);

  useEffect(() => {
    if (!activated || isRestoringRouteState) return;

    // Keep the latest live location so the cached page can resume from it later.
    setFrozenLocation({
      pathname: location.pathname,
      search: location.search,
    });
  }, [
    activated,
    isRestoringRouteState,
    location.pathname,
    location.search,
  ]);

  const effectiveLocation = useMemo(
    () =>
      activated && !isRestoringRouteState
        ? {
            pathname: location.pathname,
            search: location.search,
          }
        : frozenLocation,
    [
      activated,
      frozenLocation,
      isRestoringRouteState,
      location.pathname,
      location.search,
    ],
  );

  return {
    activated,
    effectiveLocation,
    effectivePathname: effectiveLocation.pathname,
    effectiveSearch: effectiveLocation.search,
    isRestoringRouteState,
  };
}
