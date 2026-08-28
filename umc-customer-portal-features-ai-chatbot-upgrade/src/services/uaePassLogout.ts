import axios from "axios";

import {
  resolveUaePassLogoutUrl,
  type UaePassLogoutResponse,
} from "@/utils/uaePassLogoutResponse";

const logoutClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
});

/** Requests UAE PASS session cleanup and resolves its trusted redirect URL. */
export async function requestUaePassLogout(
  token?: string | null,
): Promise<string | null> {
  try {
    const response = await logoutClient.post<UaePassLogoutResponse>(
      "/api/UAEPASS/LoginOut?from=customer",
      {},
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined,
    );

    return resolveUaePassLogoutUrl(response.data);
  } catch {
    return null;
  }
}
