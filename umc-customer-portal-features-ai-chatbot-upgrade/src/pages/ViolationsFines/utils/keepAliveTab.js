const isModuleTab = (value) => value === "appeals" || value === "violations";

export function getRequestedKeepAliveTab(search, locationState) {
  const queryTab = new URLSearchParams(search).get("tab");

  if (isModuleTab(queryTab)) {
    return queryTab;
  }

  return isModuleTab(locationState?.activeTab)
    ? locationState.activeTab
    : undefined;
}

export function resolveKeepAliveTab(currentTab, search, locationState) {
  return getRequestedKeepAliveTab(search, locationState) ?? currentTab;
}
