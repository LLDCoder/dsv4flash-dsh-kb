export const IDLE_SESSION_LOGOUT_QUERY_KEY = "idleSessionLogout";

export type HardRedirectToLoginOptions = {
  idleSessionLogout?: boolean;
  returnUrl?: string;
};

export const buildLoginUrl = (options?: HardRedirectToLoginOptions): string => {
  const searchParams = new URLSearchParams();
  if (options?.idleSessionLogout === true) {
    searchParams.set(IDLE_SESSION_LOGOUT_QUERY_KEY, "1");
  }
  if (options?.returnUrl) {
    searchParams.set("returnUrl", options.returnUrl);
  }

  const search = searchParams.toString();
  return `/login${search ? `?${search}` : ""}`;
};
