export const OPEN_PROFILE_SELECTOR_EVENT = "nma-profile-selector:open";

export function requestProfileSelection(): void {
  window.dispatchEvent(new Event(OPEN_PROFILE_SELECTOR_EVENT));
}
