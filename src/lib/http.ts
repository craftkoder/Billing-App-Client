import { ApiEnvelope, ApiError, AuthTokens } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

const ACCESS_TOKEN_KEY = "bizconnect.accessToken";
const REFRESH_TOKEN_KEY = "bizconnect.refreshToken";

export const tokenStore = {
  get accessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.refreshToken;
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        const body = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
        if (!res.ok || !body.success) return null;
        tokenStore.set(body.data);
        return body.data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: object;
  /** Skip the Authorization header — for send-otp/verify-otp/public routes. */
  anonymous?: boolean;
}

function buildUrl(path: string, query?: object): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Every request that fails purely on the network (offline, DNS, dropped
 * connection) throws a plain TypeError — the caller (e.g. the billing page)
 * checks for that to decide whether to fall back to the offline queue,
 * rather than showing a generic error.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anonymous } = options;

  const doFetch = async (accessToken: string | null): Promise<Response> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (!anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`;

    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch(tokenStore.accessToken);

  if (response.status === 401 && !anonymous) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch(newToken);
    } else {
      tokenStore.clear();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- outside the component tree; a hard reload clears all in-memory state on session expiry
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "UNAUTHORIZED", "Session expired — please log in again");
    }
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!envelope || !response.ok || !envelope.success) {
    const err = envelope && !envelope.success ? envelope.error : null;
    throw new ApiError(
      response.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? `Request failed (${response.status})`,
      err?.field,
    );
  }

  return envelope.data;
}
