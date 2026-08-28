import type { ModuleLocationState, ModuleTabKey } from "./types";

export function getRequestedKeepAliveTab(
  search: string,
  locationState?: ModuleLocationState,
): ModuleTabKey | undefined;

export function resolveKeepAliveTab(
  currentTab: ModuleTabKey,
  search: string,
  locationState?: ModuleLocationState,
): ModuleTabKey;
